"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentDefinition } from "@/library/types";
import { fillGroup, fillTree, validateTree } from "@/library/validate";
import { checkPageDetails, PATH_TAKEN_MESSAGE } from "@/page-model/details";
import {
  findInstance,
  insertInstance,
  moveInstance,
  removeInstance,
  updateProps,
} from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { savePageAction } from "./actions";
import { ComponentPicker } from "./ComponentPicker";
import { GroupFields } from "./FieldEditor";
import { Icon } from "./Icon";
import { Outline } from "./Outline";
import styles from "./PageEditor.module.css";

type PageEditorProps = {
  site: { id: string; name: string };
  /** The public address of the site, e.g. "http://ironbarks.localhost:3000". */
  siteOrigin: string;
  page: { id: string; title: string; path: string; content: ComponentInstance[] };
  /**
   * The component library, as data. This is all the editor knows about the
   * components: it never imports the React code that draws them.
   */
  definitions: Record<string, ComponentDefinition>;
};

/**
 * The page editor.
 *
 * The page being edited lives here, in the browser, as the same tree that is
 * stored in the database. Every edit swaps in a new tree using the functions
 * in src/page-model/tree.ts. Nothing reaches the server until "Save page",
 * which sends the whole page so it is never left half updated.
 */
export function PageEditor({ site, siteOrigin, page, definitions }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [path, setPath] = useState(page.path);
  // Filling gaps first means a prop added to a component after this page was
  // saved still shows up in its form.
  const [content, setContent] = useState(() => fillTree(page.content, definitions));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [failure, setFailure] = useState("");
  // Where the public page lives right now. It only moves when a save succeeds.
  const [savedPath, setSavedPath] = useState(page.path);
  // A path the server refused because another page already uses it.
  const [pathTaken, setPathTaken] = useState("");
  // Problems are pointed out only once a save has been tried, so a form that
  // is still being filled in is not covered in warnings.
  const [showProblems, setShowProblems] = useState(false);

  // Set while the "Add a component" dialog is open: where the choice will go.
  // `parentId` null means the page itself.
  const [picker, setPicker] = useState<{ parentId: string | null } | null>(null);
  // The page just before the last removal, and just after. "Undo" is offered
  // for as long as nothing else has changed since.
  const [removal, setRemoval] = useState<{
    label: string;
    before: ComponentInstance[];
    after: ComponentInstance[];
  } | null>(null);

  // Counts edits, so a save that finishes after a newer edit does not claim
  // the page is saved.
  const editCount = useRef(0);
  const formHeading = useRef<HTMLHeadingElement>(null);

  const selected = selectedId ? findInstance(content, selectedId) : undefined;
  const selectedDefinition = selected ? definitions[selected.type] : undefined;
  const issues = showProblems ? validateTree(content, definitions) : {};
  const detailErrors = showProblems ? checkPageDetails(title, path) : {};
  const pathError = detailErrors.path ?? (pathTaken === path ? PATH_TAKEN_MESSAGE : "");
  const canUndoRemoval = removal !== null && removal.after === content;

  // Warn before the tab is closed or reloaded with unsaved work.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  // Move to the form when a component is selected. On a narrow screen the
  // form is below the outline, so this also brings it into view.
  useEffect(() => {
    if (selectedId) formHeading.current?.focus();
  }, [selectedId]);

  function markChanged() {
    editCount.current += 1;
    setHasUnsavedChanges(true);
    setSaveState("idle");
  }

  function changeContent(next: ComponentInstance[]) {
    setContent(next);
    markChanged();
  }

  function addComponent(type: string) {
    if (!picker) return;
    const definition = definitions[type];

    const instance: ComponentInstance = {
      id: crypto.randomUUID(),
      type,
      props: fillGroup(definition.fields, {}),
    };
    if (definition.acceptsChildren) instance.children = [];

    changeContent(insertInstance(content, picker.parentId, instance));
    setSelectedId(instance.id);
    setPicker(null);
  }

  function removeComponent(id: string) {
    const instance = findInstance(content, id);
    if (!instance) return;

    const after = removeInstance(content, id);
    setRemoval({
      label: definitions[instance.type]?.label ?? "Component",
      before: content,
      after,
    });
    changeContent(after);
    // The selected component may be the one removed, or inside it.
    if (selectedId && !findInstance(after, selectedId)) setSelectedId(null);
  }

  function changeSelectedProps(props: Record<string, unknown>, removed?: string) {
    if (!selected) return;
    const after = updateProps(content, selected.id, props);
    // The form says when a change removed something, such as a card.
    if (removed) setRemoval({ label: removed, before: content, after });
    changeContent(after);
  }

  function undoRemoval() {
    if (!removal) return;
    changeContent(removal.before);
    setRemoval(null);
  }

  async function save() {
    // Check here first so problems show at once. The server checks again.
    const foundDetails = checkPageDetails(title, path);
    const foundIssues = validateTree(content, definitions);
    if (foundDetails.title || foundDetails.path || Object.keys(foundIssues).length > 0) {
      setShowProblems(true);
      setFailure("This page can't be saved yet. Fix the problems marked below, then save again.");
      setSaveState("failed");
      return;
    }

    const editsWhenSent = editCount.current;
    setSaveState("saving");
    try {
      const result = await savePageAction({ pageId: page.id, title, path, content });

      if (result.ok) {
        setSavedPath(path.trim());
        setShowProblems(false);
        setPathTaken("");
        if (editCount.current === editsWhenSent) {
          setHasUnsavedChanges(false);
          setSaveState("saved");
        } else {
          // Something changed while the save was on its way.
          setSaveState("idle");
        }
        return;
      }

      setShowProblems(true);
      if (result.detailErrors?.path) setPathTaken(path);
      setFailure(result.message);
    } catch {
      setFailure(
        "The page could not be saved. Check that the database is running, then try again.",
      );
    }
    setSaveState("failed");
  }

  const status =
    saveState === "saving"
      ? "Saving…"
      : hasUnsavedChanges
        ? "Unsaved changes. The live page shows your last save."
        : saveState === "saved"
          ? "Saved. The live page is up to date."
          : "";

  return (
    <main className={styles.editor}>
      <header className={styles.toolbar}>
        <div className={styles.heading}>
          <nav aria-label="Breadcrumb">
            {/* Plain links, so leaving with unsaved changes triggers the
                browser's "leave site?" warning. */}
            <ol className="breadcrumbs">
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/">Sites</a>
              </li>
              <li>
                <a href={`/sites/${site.id}`}>{site.name}</a>
              </li>
              <li aria-current="page">Edit page</li>
            </ol>
          </nav>
          <h1>{title.trim() || "Untitled page"}</h1>
        </div>

        <div className={styles.toolbarActions}>
          <p className={styles.status} role="status">
            {status}
          </p>
          <a
            className="button"
            href={`${siteOrigin}${savedPath}`}
            target="_blank"
            rel="noreferrer"
          >
            View page
            <span className="visually-hidden"> in a new tab</span>
            <Icon name="open" />
          </a>
          <button
            type="button"
            className="button"
            data-variant="primary"
            disabled={saveState === "saving"}
            onClick={save}
          >
            Save page
          </button>
        </div>
      </header>

      {saveState === "failed" && (
        <p className={styles.failure} role="alert">
          <Icon name="problem" />
          {failure}
        </p>
      )}

      {canUndoRemoval && (
        <p className={styles.notice} role="status">
          {removal.label} removed.
          <button type="button" className="button" onClick={undoRemoval}>
            Undo
          </button>
        </p>
      )}

      <div className={styles.columns}>
        <div className={styles.side}>
          <section className={`panel ${styles.panel}`} aria-labelledby="details-heading">
            <h2 id="details-heading">Page details</h2>

            <div className="field">
              <label className="label" htmlFor="page-title">
                Title
              </label>
              <input
                id="page-title"
                className="input"
                value={title}
                aria-invalid={detailErrors.title ? true : undefined}
                aria-describedby={detailErrors.title ? "page-title-error" : undefined}
                onChange={(event) => {
                  setTitle(event.target.value);
                  markChanged();
                }}
              />
              {detailErrors.title && (
                <p className="error" id="page-title-error">
                  <Icon name="problem" />
                  {detailErrors.title}
                </p>
              )}
            </div>

            <div className="field">
              <label className="label" htmlFor="page-path">
                Path
              </label>
              <input
                id="page-path"
                className="input data"
                value={path}
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={pathError ? true : undefined}
                aria-describedby={pathError ? "page-path-error" : "page-path-help"}
                onChange={(event) => {
                  setPath(event.target.value);
                  markChanged();
                }}
              />
              {pathError ? (
                <p className="error" id="page-path-error">
                  <Icon name="problem" />
                  {pathError}
                </p>
              ) : (
                <p className="help" id="page-path-help">
                  The address of the page on {site.name}.
                </p>
              )}
            </div>
          </section>

          <section className={`panel ${styles.panel}`} aria-labelledby="outline-heading">
            <h2 id="outline-heading">Components</h2>

            {content.length === 0 && (
              <p className="muted">
                This page is empty. Add a component to start building it.
              </p>
            )}

            <Outline
              nodes={content}
              definitions={definitions}
              selectedId={selectedId}
              issues={issues}
              onSelect={setSelectedId}
              onMove={(id, direction) => changeContent(moveInstance(content, id, direction))}
              onRemove={removeComponent}
              onAddInside={(parentId) => setPicker({ parentId })}
            />

            <div>
              <button
                type="button"
                className="button"
                data-variant={content.length === 0 ? "primary" : undefined}
                onClick={() => setPicker({ parentId: null })}
              >
                <Icon name="add" />
                Add component
              </button>
            </div>
          </section>
        </div>

        <section className={`panel ${styles.panel}`} aria-labelledby="form-heading">
          {!selected && (
            <>
              <h2 id="form-heading">No component selected</h2>
              <p className="muted">
                Select a component in the outline to edit its content.
              </p>
            </>
          )}

          {selected && !selectedDefinition && (
            <>
              <h2 id="form-heading" ref={formHeading} tabIndex={-1}>
                Unknown component
              </h2>
              <p>
                This page uses a component called{" "}
                <span className="data">{selected.type}</span>, which is no
                longer in the library. Remove it to save the page.
              </p>
              <div>
                <button
                  type="button"
                  className="button"
                  onClick={() => removeComponent(selected.id)}
                >
                  Remove component
                </button>
              </div>
            </>
          )}

          {selected && selectedDefinition && (
            <>
              <div>
                <h2 id="form-heading" ref={formHeading} tabIndex={-1}>
                  {selectedDefinition.label}
                </h2>
                <p className="muted">{selectedDefinition.description}</p>
              </div>

              <GroupFields
                // A new key per component, so one component's open list
                // entries don't carry over to the next.
                key={selected.id}
                fields={selectedDefinition.fields}
                value={selected.props}
                path=""
                shared={{ issues: issues[selected.id] ?? [], idPrefix: selected.id }}
                onChange={(props, removed) =>
                  changeSelectedProps(props as Record<string, unknown>, removed)
                }
              />
            </>
          )}
        </section>
      </div>

      <ComponentPicker
        open={picker !== null}
        destination={pickerDestination(picker, content, definitions)}
        definitions={definitions}
        onPick={addComponent}
        onClose={() => setPicker(null)}
      />
    </main>
  );
}

/** Names where a new component will go: "the page", or the container chosen. */
function pickerDestination(
  picker: { parentId: string | null } | null,
  content: ComponentInstance[],
  definitions: Record<string, ComponentDefinition>,
): string {
  if (!picker?.parentId) return "the page";
  const parent = findInstance(content, picker.parentId);
  const label = parent ? definitions[parent.type]?.label : undefined;
  return label ? `this ${label.toLowerCase()}` : "the page";
}
