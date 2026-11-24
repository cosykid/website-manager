"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ComponentDefinition } from "@/library/types";
import {
  fillGroup,
  fillTree,
  validateTree,
  type IssuesByInstance,
} from "@/library/validate";
import { checkPageDetails, PATH_TAKEN_MESSAGE } from "@/page-model/details";
import type { PageLink } from "@/page-model/page-tree";
import {
  findAncestors,
  findInstance,
  findPlace,
  insertInstance,
  moveInstance,
  moveInstanceTo,
  removeInstance,
  updateProps,
  type Place,
} from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { savePageAction } from "./actions";
import { ComponentPicker } from "./ComponentPicker";
import { useDrafts, type PageValues } from "./Drafts";
import { GroupFields } from "./FieldEditor";
import { Icon } from "./Icon";
import { labelOf } from "./instance-names";
import { Outline, rowId } from "./Outline";
import styles from "./PageEditor.module.css";
import { PageJsonDialog } from "./PageJsonDialog";
import { PageList } from "./PageList";
import { PlacedIn } from "./PlacedIn";
import { PreviewPane } from "./PreviewPane";
import { SiteMark } from "./SiteMark";
import { atDepth } from "./tree-depth";

type PageEditorProps = {
  site: {
    id: string;
    name: string;
    /** From the site's theme, for the mark beside its name. */
    colors: { brand: string; accent: string; surface: string };
  };
  /** The public address of the site, e.g. "http://ironbarks.localhost:3000". */
  siteOrigin: string;
  /** Every page of the site, to move from one to another. */
  pages: PageLink[];
  page: { id: string; title: string; path: string; content: ComponentInstance[] };
  /**
   * The component library, as data. This is all the editor knows about the
   * components: it never imports the React code that draws them.
   */
  definitions: Record<string, ComponentDefinition>;
};

/** Which form is open, if any. */
type Open =
  | { kind: "list" }
  | { kind: "details" }
  | { kind: "component"; id: string };

/** The HTML id of the page's own row, for putting focus back on it. */
const detailsRowId = "details-row";

/**
 * The page editor.
 *
 * The page being edited lives here, in the browser, as the same tree that is
 * stored in the database. Every edit swaps in a new tree using the functions
 * in src/page-model/tree.ts, and is kept as a draft (see Drafts.tsx). Nothing
 * reaches the server until "Save page", which sends the whole page so it is
 * never left half updated.
 *
 * The screen has three parts: what there is to edit (the site's pages, then
 * this page's components), a form for the one that is chosen, and a live
 * preview of the page as visitors will see it. A wide window shows all three.
 * A smaller one shows the form in the list's place, with "Back" to return.
 */
export function PageEditor({
  site,
  siteOrigin,
  pages,
  page,
  definitions,
}: PageEditorProps) {
  const router = useRouter();

  // The page as it was last saved. Filling gaps first means a prop added to a
  // component after this page was saved still shows up in its form.
  const [saved, setSaved] = useState<PageValues>(() => ({
    title: page.title,
    path: page.path,
    content: fillTree(page.content, definitions),
  }));
  // The page as it stands now: with its unsaved changes, if it has any.
  const { drafts, keepDraft, dropDraft } = useDrafts();
  const draft = drafts[page.id];
  const { title, path, content } = draft ?? saved;
  const pageTitle = title.trim() || "Untitled page";

  const [open, setOpen] = useState<Open>({ kind: "list" });
  // The components in the list that are folded shut.
  const [folded, setFolded] = useState<string[]>([]);
  // A narrow screen has room for one side at a time. This says which.
  const [narrowSide, setNarrowSide] = useState<"edit" | "preview">("edit");

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [failure, setFailure] = useState("");
  // A path the server refused because another page already uses it.
  const [pathTaken, setPathTaken] = useState("");
  // Problems are pointed out only once a save has been tried, so a form that
  // is still being filled in is not covered in warnings.
  const [showProblems, setShowProblems] = useState(false);

  // Set while the "Add a component" dialog is open: where the choice will go.
  // `parentId` null means the page itself.
  const [picker, setPicker] = useState<{ parentId: string | null } | null>(null);
  // Whether the "Page JSON" dialog is open.
  const [jsonOpen, setJsonOpen] = useState(false);
  // The last change that moved something or took something away: what to say
  // about it, and the page just before and just after. "Undo" is offered for
  // as long as nothing else has changed since.
  const [undoable, setUndoable] = useState<{
    message: string;
    before: ComponentInstance[];
    after: ComponentInstance[];
  } | null>(null);

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
  const canUndo = undoable !== null && undoable.after === content;

  // Keyboard focus follows the left side: to a form when one opens, and back
  // to the row it was opened from when it closes.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;

    if (open.kind === "list") document.getElementById(returnTo.current)?.focus();
    else formHeading.current?.focus();
  }, [open]);

  /** Opens a form: the page details, or one component's. */
  function openForm(next: Open) {
    moveFocus.current = true;
    setOpen(next);
    // On a narrow screen the form may be behind the preview.
    setNarrowSide("edit");

    // The row it belongs to may be folded away inside another.
    if (next.kind === "component") {
      const around = findAncestors(content, next.id).map((ancestor) => ancestor.id);
      setFolded(folded.filter((id) => !around.includes(id)));
    }
  }

  /** A component was clicked in the preview. */
  function openFromPreview(id: string) {
    if (findInstance(content, id)) openForm({ kind: "component", id });
  }

  /** A link in the site's own menu was clicked in the preview. */
  function openPageAt(wantedPath: string) {
    const target = pages.find((other) => other.path === wantedPath);
    if (target && target.id !== page.id) {
      router.push(`/sites/${site.id}/pages/${target.id}`);
    }
  }

  function backToList() {
    returnTo.current = open.kind === "component" ? rowId(open.id) : detailsRowId;
    moveFocus.current = true;
    setOpen({ kind: "list" });
  }

  function foldRow(id: string, shut: boolean) {
    setFolded(shut ? [...folded, id] : folded.filter((other) => other !== id));
  }

  /** Every edit to the page goes through here. */
  function change(changes: Partial<PageValues>) {
    keepDraft(page.id, { title, path, content, ...changes });
    setSaveState("idle");
  }

  /** An edit that "Undo" can take back, and what to say about it. */
  function changeWithUndo(after: ComponentInstance[], message: string) {
    setUndoable({ message, before: content, after });
    change({ content: after });
  }

  function undo() {
    if (!undoable) return;
    change({ content: undoable.before });
    // The open form may belong to a component the undo takes away again.
    if (open.kind === "component" && !findInstance(undoable.before, open.id)) {
      setOpen({ kind: "list" });
    }
    setUndoable(null);
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

    change({ content: insertInstance(content, picker.parentId, instance) });
    openForm({ kind: "component", id: instance.id });
    setPicker(null);
  }

  function moveComponentTo(id: string, place: Place) {
    const instance = findInstance(content, id);
    const after = moveInstanceTo(content, id, place);
    // Dropped back where it was.
    if (!instance || after === content) return;

    // "Banner moved." within a list, "Banner moved into Section." between two.
    const changesParent = findPlace(content, id)?.parentId !== place.parentId;
    const parent = place.parentId ? findInstance(content, place.parentId) : undefined;
    const into = parent ? `into ${labelOf(parent, definitions)}` : "on to the page";
    const label = labelOf(instance, definitions);
    changeWithUndo(after, changesParent ? `${label} moved ${into}.` : `${label} moved.`);
  }

  function removeComponent(id: string) {
    const instance = findInstance(content, id);
    if (!instance) return;

    const after = removeInstance(content, id);
    changeWithUndo(after, `${labelOf(instance, definitions)} removed.`);
    // The open form may belong to what was removed. Show the list again.
    if (open.kind === "component" && !findInstance(after, open.id)) {
      setOpen({ kind: "list" });
    }
  }

  function changeSelectedProps(props: Record<string, unknown>, removed?: string) {
    if (!selected) return;
    const after = updateProps(content, selected.id, props);
    // The form says when a change removed something, such as a card.
    if (removed) changeWithUndo(after, `${removed} removed.`);
    else change({ content: after });
  }

  /**
   * Swaps every component on the page for the ones read from a file. Like any
   * other edit, it stays in the browser until "Save page".
   */
  function replaceComponents(fileName: string, fromFile: ComponentInstance[]) {
    const after = fillTree(fromFile, definitions);
    changeWithUndo(after, `Components replaced from ${fileName}.`);
    // A file can hold props that do not suit their component. Mark them
    // straight away, as a refused save would.
    if (Object.keys(validateTree(after, definitions)).length > 0) setShowProblems(true);
    // An open form may belong to a component that is no longer on the page.
    setOpen({ kind: "list" });
    setJsonOpen(false);
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
    setFolded([]);
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

    setSaveState("saving");
    try {
      const result = await savePageAction({ pageId: page.id, title, path, content });

      if (result.ok) {
        // The server trims these two, so show them as they were stored.
        setSaved({ title: title.trim(), path: path.trim(), content });
        dropDraft(page.id, draft);
        setShowProblems(false);
        setPathTaken("");
        setSaveState("saved");
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
      : draft
        ? "Unsaved changes. The live page shows your last save."
        : saveState === "saved"
          ? "Saved. The live page is up to date."
          : "";

  return (
    <main className={styles.editor}>
      <header className={styles.toolbar}>
        <div className={styles.location}>
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumbs">
              <li>
                <Link href="/">Sites</Link>
              </li>
              <li>
                <Link className={styles.siteCrumb} href={`/sites/${site.id}`}>
                  <SiteMark colors={site.colors} size="small" />
                  {site.name}
                </Link>
              </li>
            </ol>
          </nav>
          <h1 className={styles.title}>{pageTitle}</h1>
        </div>

        <div className={styles.toolbarActions}>
          <p className={styles.status} role="status">
            {status}
          </p>
          <button type="button" className="button" onClick={() => setJsonOpen(true)}>
            JSON
            <span className="visually-hidden">: export or import this page</span>
          </button>
          <a
            className="button"
            href={`${siteOrigin}${saved.path}`}
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

      <div
        className={styles.columns}
        data-open={open.kind === "list" ? "list" : "form"}
        data-narrow-side={narrowSide}
      >
        <div className={styles.listPanel}>
          <PageList siteId={site.id} pages={pages} currentId={page.id} />

          {/* The page and everything on it, as one tree: the page's own row,
              then its components one step in. */}
          <section aria-labelledby="page-heading">
            <h2 id="page-heading" className={styles.pageHeading}>
              <button
                type="button"
                id={detailsRowId}
                className={`tree-row ${styles.pageRow}`}
                style={atDepth(0)}
                data-selected={selected === undefined || undefined}
                onClick={() => openForm({ kind: "details" })}
              >
                <Icon name="page" />
                <span className="tree-label" data-strong>
                  {pageTitle}
                </span>{" "}
                <span className="tree-note">Page details</span>{" "}
                {detailProblems > 0 && (
                  <span className="problem-count">
                    <Icon name="problem" size={14} />
                    {detailProblems} {detailProblems === 1 ? "problem" : "problems"}
                  </span>
                )}
              </button>
            </h2>

            <div className="tree-children" style={atDepth(0)}>
              {content.length === 0 && (
                <p className={`muted ${styles.outlineEmpty}`}>
                  This page is empty. Add a component to start building it.
                </p>
              )}

              <Outline
                content={content}
                definitions={definitions}
                issues={issues}
                selectedId={selected ? selected.id : null}
                folded={folded}
                onFold={foldRow}
                onSelect={(id) => openForm({ kind: "component", id })}
                onMove={(id, direction) =>
                  change({ content: moveInstance(content, id, direction) })
                }
                onMoveTo={moveComponentTo}
                onRemove={removeComponent}
                onAddInside={(parentId) => setPicker({ parentId })}
              />

              <button
                type="button"
                className={`button ${styles.addComponent}`}
                data-variant={content.length === 0 ? "primary" : "quiet"}
                onClick={() => setPicker({ parentId: null })}
              >
                <Icon name="add" />
                Add component
              </button>
            </div>
          </section>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.back}>
            <button type="button" className="button" data-variant="quiet" onClick={backToList}>
              <Icon name="back" />
              Back
              <span className="visually-hidden"> to the list</span>
            </button>
          </div>

          <section className={styles.form} aria-labelledby="form-heading">
            {!selected && (
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
                    onChange={(event) => change({ title: event.target.value })}
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
                    onChange={(event) => change({ path: event.target.value })}
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

                {open.kind === "list" && content.length > 0 && (
                  <p className={`muted ${styles.hint}`}>
                    To edit a component, choose it in the list or click it in the
                    preview.
                  </p>
                )}
              </>
            )}

            {selected && (
              // What the component is inside, so that its place is clear even
              // when the list is not showing. Each step opens that form.
              <nav aria-label="Placed in">
                <ol className={styles.trail}>
                  <li>
                    <button type="button" onClick={() => openForm({ kind: "details" })}>
                      {pageTitle}
                    </button>
                  </li>
                  {findAncestors(content, selected.id).map((ancestor) => (
                    <li key={ancestor.id}>
                      <button
                        type="button"
                        onClick={() => openForm({ kind: "component", id: ancestor.id })}
                      >
                        {labelOf(ancestor, definitions)}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
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

                <PlacedIn
                  id={selected.id}
                  content={content}
                  definitions={definitions}
                  onMove={(parentId) =>
                    moveComponentTo(selected.id, { parentId, beforeId: null })
                  }
                />
              </>
            )}
          </section>
        </div>

        <div className={styles.previewSide}>
          <PreviewPane
            pageId={page.id}
            pageTitle={pageTitle}
            content={content}
            selectedId={selected ? selected.id : null}
            onSelect={openFromPreview}
            onVisit={openPageAt}
          />
        </div>
      </div>

      {/* Always in the page, so screen readers announce what appears in it. */}
      <div className={styles.noticeArea} role="status">
        {canUndo && (
          <p className={styles.notice}>
            {undoable.message}
            <button type="button" className={styles.undo} onClick={undo}>
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

      <PageJsonDialog
        open={jsonOpen}
        page={{
          schemaVersion: 1,
          siteId: site.id,
          path: path.trim(),
          title: title.trim(),
          content,
        }}
        hasUnsavedChanges={draft !== undefined}
        onImport={replaceComponents}
        onClose={() => setJsonOpen(false)}
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
