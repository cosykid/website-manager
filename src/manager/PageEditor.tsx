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
import { PageDetailsForm } from "./PageDetailsForm";
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

/** What is chosen, to edit. */
type Open = {
  /** The component, or null for the page itself and its details. */
  id: string | null;
  /** Whether its form is open. A wide window shows the form all the time. */
  form: boolean;
};

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

  const [open, setOpen] = useState<Open>({ id: null, form: false });
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
  // While a component is dragged: which one, and where it would go. The
  // preview shows it there already.
  const [dragged, setDragged] = useState<{ id: string; place: Place } | null>(null);

  // The last change that moved something or took something away: what to say
  // about it, and the page just before and just after. "Undo" is offered for
  // as long as nothing else has changed since.
  const [undoable, setUndoable] = useState<{
    message: string;
    before: ComponentInstance[];
    after: ComponentInstance[];
  } | null>(null);

  const formHeading = useRef<HTMLHeadingElement>(null);
  // Whether the next change of what is open should move keyboard focus.
  const moveFocus = useRef(false);

  const selected = open.id ? findInstance(content, open.id) : undefined;
  const selectedDefinition = selected ? definitions[selected.type] : undefined;
  // What it is inside, and the components it is in a row with.
  const ancestors = selected ? findAncestors(content, selected.id) : [];
  const siblings = ancestors.at(-1)?.children ?? content;
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

    const row = open.id ? rowId(open.id) : detailsRowId;
    if (open.form) formHeading.current?.focus();
    else document.getElementById(row)?.focus();
  }, [open]);

  /** Opens a form: one component's, or the page details for null. */
  function openForm(id: string | null) {
    moveFocus.current = true;
    setOpen({ id, form: true });
    // On a narrow screen the form may be behind the preview.
    setNarrowSide("edit");
    if (id) unfoldAround(id, content);
  }

  /** Opens the rows a component's own row may be folded away inside. */
  function unfoldAround(id: string, nodes: ComponentInstance[]) {
    const around = findAncestors(nodes, id).map((ancestor) => ancestor.id);
    setFolded(folded.filter((other) => !around.includes(other)));
  }

  /** A component was clicked in the preview. */
  function openFromPreview(id: string) {
    if (findInstance(content, id)) openForm(id);
  }

  /** A link in the site's own menu was clicked in the preview. */
  function openPageAt(wantedPath: string) {
    const target = pages.find((other) => other.path === wantedPath);
    if (target && target.id !== page.id) {
      router.push(`/sites/${site.id}/pages/${target.id}`);
    }
  }

  function backToList() {
    moveFocus.current = true;
    setOpen({ ...open, form: false });
  }

  /** Back to the start: the list, with the page itself chosen. */
  function showList() {
    setOpen({ id: null, form: false });
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
    // The undo may take away the component that is chosen.
    if (open.id && !findInstance(undoable.before, open.id)) showList();
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
    openForm(instance.id);
    setPicker(null);
  }

  function moveComponent(id: string, place: Place) {
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

    // Choosing it shows where it went, in the list and in the preview.
    setOpen({ ...open, id });
    unfoldAround(id, after);
  }

  /** Moves the component whose form is open one place among its neighbours. */
  function moveSelected(direction: "up" | "down") {
    if (!selected) return;
    const after = moveInstance(content, selected.id, direction);
    changeWithUndo(after, `${labelOf(selected, definitions)} moved ${direction}.`);
  }

  function removeComponent(id: string) {
    const instance = findInstance(content, id);
    if (!instance) return;

    const after = removeInstance(content, id);
    changeWithUndo(after, `${labelOf(instance, definitions)} removed.`);
    // It may be the component that is chosen, or what that one is in.
    if (open.id && !findInstance(after, open.id)) showList();
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
    // What was chosen may be a component that is no longer on the page.
    showList();
    setJsonOpen(false);
  }

  /**
   * After a save is refused, makes sure a marked problem is in view. An open
   * form that has one stays open. Otherwise the list is shown, where each
   * row says how many problems it has.
   */
  function revealProblems(found: IssuesByInstance, detailsHaveProblem: boolean) {
    const openFormHasProblem = open.id ? open.id in found : detailsHaveProblem;

    if (!openFormHasProblem) showList();
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
        data-open={open.form ? "form" : "list"}
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
                onClick={() => openForm(null)}
              >
                <Icon name="page" />
                <span className="tree-text">
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
                </span>
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
                onSelect={openForm}
                onMove={moveComponent}
                onDrag={setDragged}
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

                <PageDetailsForm
                  siteName={site.name}
                  title={title}
                  path={path}
                  titleError={detailErrors.title}
                  pathError={pathError}
                  onChange={change}
                />

                {!open.form && content.length > 0 && (
                  <p className={`muted ${styles.hint}`}>
                    To edit a component, choose it in the list or click it in the
                    preview. To move one, drag it by its six dots.
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
                    <button type="button" onClick={() => openForm(null)}>
                      {pageTitle}
                    </button>
                  </li>
                  {ancestors.map((ancestor) => (
                    <li key={ancestor.id}>
                      <button type="button" onClick={() => openForm(ancestor.id)}>
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
                  <div className={styles.formTitle}>
                    <h2 id="form-heading" ref={formHeading} tabIndex={-1}>
                      {selectedDefinition.label}
                    </h2>
                    <FormActions
                      isFirst={siblings[0] === selected}
                      isLast={siblings.at(-1) === selected}
                      onMove={moveSelected}
                      onRemove={() => removeComponent(selected.id)}
                    />
                  </div>
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
                    moveComponent(selected.id, { parentId, beforeId: null })
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
            content={
              dragged ? moveInstanceTo(content, dragged.id, dragged.place) : content
            }
            selectedId={dragged ? dragged.id : (selected?.id ?? null)}
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

/** Move up, move down and remove, beside the name of the open component. */
function FormActions({
  isFirst,
  isLast,
  onMove,
  onRemove,
}: {
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: "up" | "down") => void;
  onRemove: () => void;
}) {
  // At the first and last place an arrow has nowhere left to go. It is marked
  // as disabled but stays a working button, because one that is really
  // disabled would lose keyboard focus part way through a few presses.
  return (
    <div className={styles.formActions}>
      <button
        type="button"
        className="icon-button"
        title="Move up"
        aria-label="Move up"
        aria-disabled={isFirst}
        onClick={() => !isFirst && onMove("up")}
      >
        <Icon name="up" />
      </button>
      <button
        type="button"
        className="icon-button"
        title="Move down"
        aria-label="Move down"
        aria-disabled={isLast}
        onClick={() => !isLast && onMove("down")}
      >
        <Icon name="down" />
      </button>
      <button
        type="button"
        className="icon-button"
        title="Remove"
        aria-label="Remove"
        onClick={onRemove}
      >
        <Icon name="remove" />
      </button>
    </div>
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
