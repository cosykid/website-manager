"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentDefinition } from "@/library/types";
import {
  fillGroup,
  fillTree,
  validateTree,
  type IssuesByInstance,
} from "@/library/validate";
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
import { Outline, rowId } from "./Outline";
import styles from "./PageEditor.module.css";
import { PreviewPane } from "./PreviewPane";
import { SiteMark } from "./SiteMark";

type PageEditorProps = {
  site: {
    id: string;
    name: string;
    /** From the site's theme, for the mark beside its name. */
    colors: { brand: string; accent: string; surface: string };
  };
  /** The public address of the site, e.g. "http://ironbarks.localhost:3000". */
  siteOrigin: string;
  page: { id: string; title: string; path: string; content: ComponentInstance[] };
  /**
   * The component library, as data. This is all the editor knows about the
   * components: it never imports the React code that draws them.
   */
  definitions: Record<string, ComponentDefinition>;
};

/** What the left side shows: the list of everything on the page, or one form. */
type Open =
  | { kind: "list" }
  | { kind: "details" }
  | { kind: "component"; id: string };

/** The HTML id of the "Page details" row, for putting focus back on it. */
const detailsRowId = "details-row";

/**
 * The page editor.
 *
 * The page being edited lives here, in the browser, as the same tree that is
 * stored in the database. Every edit swaps in a new tree using the functions
 * in src/page-model/tree.ts. Nothing reaches the server until "Save page",
 * which sends the whole page so it is never left half updated.
 *
 * The screen has two sides. The left starts as a list of what can be edited:
 * the page details, then every component. Choosing one opens its form in the
 * list's place, and "Back" returns to the list. The right is a live preview:
 * the page as visitors will see it, redrawn on every edit. Clicking a
 * component there opens its form too.
 */
export function PageEditor({ site, siteOrigin, page, definitions }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [path, setPath] = useState(page.path);
  // Filling gaps first means a prop added to a component after this page was
  // saved still shows up in its form.
  const [content, setContent] = useState(() => fillTree(page.content, definitions));
  const [open, setOpen] = useState<Open>({ kind: "list" });
  // A narrow screen has room for one side at a time. This says which.
  const [narrowSide, setNarrowSide] = useState<"edit" | "preview">("edit");

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
  // Whether the next change of what is open should move keyboard focus, and
  // the row to put it on when a form closes.
  const moveFocus = useRef(false);
  const returnTo = useRef("");

  const selected = open.kind === "component" ? findInstance(content, open.id) : undefined;
  const selectedDefinition = selected ? definitions[selected.type] : undefined;
  const issues = showProblems ? validateTree(content, definitions) : {};
  const detailErrors = showProblems ? checkPageDetails(title, path) : {};
  const pathError = detailErrors.path ?? (pathTaken === path ? PATH_TAKEN_MESSAGE : "");
  const detailProblems = (detailErrors.title ? 1 : 0) + (pathError ? 1 : 0);
  const canUndoRemoval = removal !== null && removal.after === content;

  // Warn before the tab is closed or reloaded with unsaved work.
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);

  // Keyboard focus follows the left side: to a form when one opens, and back
  // to the row it was opened from when it closes.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;

    if (open.kind === "list") document.getElementById(returnTo.current)?.focus();
    else formHeading.current?.focus();
  }, [open]);

  /** Opens a form on the left: the page details, or one component's. */
  function openForm(next: Open) {
    moveFocus.current = true;
    setOpen(next);
    // On a narrow screen the form may be behind the preview.
    setNarrowSide("edit");
  }

  /** A component was clicked in the preview. */
  function openFromPreview(id: string) {
    if (findInstance(content, id)) openForm({ kind: "component", id });
  }

  function backToList() {
    returnTo.current = open.kind === "component" ? rowId(open.id) : detailsRowId;
    moveFocus.current = true;
    setOpen({ kind: "list" });
  }

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
    openForm({ kind: "component", id: instance.id });
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
    // The open form may belong to what was removed. Show the list again.
    if (open.kind === "component" && !findInstance(after, open.id)) {
      setOpen({ kind: "list" });
    }
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

  /**
   * After a save is refused, makes sure a marked problem is in view. An open
   * form that has one stays open. Otherwise the list is shown, where each
   * row says how many problems it has.
   */
  function revealProblems(found: IssuesByInstance, detailsHaveProblem: boolean) {
    const openFormHasProblem =
      (open.kind === "component" && open.id in found) ||
      (open.kind === "details" && detailsHaveProblem);

    if (!openFormHasProblem) setOpen({ kind: "list" });
    setNarrowSide("edit");
  }

  async function save() {
    // Check here first so problems show at once. The server checks again.
    const foundDetails = checkPageDetails(title, path);
    const foundIssues = validateTree(content, definitions);
    const detailsHaveProblem = Boolean(foundDetails.title || foundDetails.path);
    if (detailsHaveProblem || Object.keys(foundIssues).length > 0) {
      setShowProblems(true);
      revealProblems(foundIssues, detailsHaveProblem);
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
      revealProblems(result.issues ?? {}, result.detailErrors !== undefined);
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
        <div className={styles.location}>
          <nav aria-label="Breadcrumb">
            {/* Plain links, so leaving with unsaved changes triggers the
                browser's "leave site?" warning. */}
            <ol className="breadcrumbs">
              <li>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a href="/">Sites</a>
              </li>
              <li>
                <a className={styles.siteCrumb} href={`/sites/${site.id}`}>
                  <SiteMark colors={site.colors} size="small" />
                  {site.name}
                </a>
              </li>
            </ol>
          </nav>
          <h1 className={styles.title}>{title.trim() || "Untitled page"}</h1>
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

        {/* Inside the toolbar, so a failed save is seen however far down the
            page the editor has scrolled. */}
        {saveState === "failed" && (
          <p className={styles.failure} role="alert">
            <Icon name="problem" />
            {failure}
          </p>
        )}
      </header>

      {/* Shown only on a narrow screen, where the two sides do not fit
          next to each other. */}
      <div className={`segmented ${styles.sides}`} role="group" aria-label="Show">
        <button
          type="button"
          aria-pressed={narrowSide === "edit"}
          onClick={() => setNarrowSide("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          aria-pressed={narrowSide === "preview"}
          onClick={() => setNarrowSide("preview")}
        >
          Preview
        </button>
      </div>

      <div className={styles.columns} data-narrow-side={narrowSide}>
        <div className={styles.panel}>
          {open.kind === "list" && (
            <>
              <button
                type="button"
                id={detailsRowId}
                className={styles.detailsRow}
                onClick={() => openForm({ kind: "details" })}
              >
                Page details
                {detailProblems > 0 && (
                  <span className="problem-count">
                    <Icon name="problem" size={14} />
                    {detailProblems} {detailProblems === 1 ? "problem" : "problems"}
                  </span>
                )}
              </button>

              <section className={styles.outline} aria-labelledby="outline-heading">
                <h2 id="outline-heading" className={`section-heading ${styles.outlineHeading}`}>
                  Components
                </h2>

                {content.length === 0 && (
                  <p className={`muted ${styles.outlineEmpty}`}>
                    This page is empty. Add a component to start building it.
                  </p>
                )}

                <Outline
                  nodes={content}
                  definitions={definitions}
                  issues={issues}
                  onSelect={(id) => openForm({ kind: "component", id })}
                  onMove={(id, direction) => changeContent(moveInstance(content, id, direction))}
                  onRemove={removeComponent}
                  onAddInside={(parentId) => setPicker({ parentId })}
                />

                <div>
                  <button
                    type="button"
                    className="button"
                    data-variant={content.length === 0 ? "primary" : "quiet"}
                    onClick={() => setPicker({ parentId: null })}
                  >
                    <Icon name="add" />
                    Add component
                  </button>
                </div>
              </section>
            </>
          )}

          {open.kind !== "list" && (
            <div className={styles.formView}>
              <div>
                <button
                  type="button"
                  className="button"
                  data-variant="quiet"
                  onClick={backToList}
                >
                  <Icon name="back" />
                  Back
                  <span className="visually-hidden"> to the list</span>
                </button>
              </div>

              <section className={styles.form} aria-labelledby="form-heading">
                {open.kind === "details" && (
                  <>
                    <div className={styles.formHeading}>
                      <h2 id="form-heading" ref={formHeading} tabIndex={-1}>
                        Page details
                      </h2>
                      <p className="muted">
                        What this page is called, and where it lives on {site.name}.
                      </p>
                    </div>

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
                        className="input"
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
                          The address of the page on {site.name}. The home page is
                          &quot;/&quot;.
                        </p>
                      )}
                    </div>
                  </>
                )}

                {selected && !selectedDefinition && (
                  <>
                    <div className={styles.formHeading}>
                      <h2 id="form-heading" ref={formHeading} tabIndex={-1}>
                        Unknown component
                      </h2>
                      <p>
                        This page uses a component called &quot;{selected.type}&quot;,
                        which is no longer in the library. Remove it to save the
                        page.
                      </p>
                    </div>
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
                    <div className={styles.formHeading}>
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
          )}
        </div>

        <div className={styles.previewSide}>
          <PreviewPane
            pageId={page.id}
            pageTitle={title.trim() || "Untitled page"}
            content={content}
            selectedId={selected ? selected.id : null}
            onSelect={openFromPreview}
          />
        </div>
      </div>

      {/* Always in the page, so screen readers announce what appears in it. */}
      <div className={styles.noticeArea} role="status">
        {canUndoRemoval && (
          <p className={styles.notice}>
            {removal.label} removed.
            <button type="button" className={styles.undo} onClick={undoRemoval}>
              Undo
            </button>
          </p>
        )}
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
