"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ComponentDefinition } from "@/library/types";
import type { IssuesByInstance } from "@/library/validate";
import { findAncestors, findInstance, type Place } from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { keyRequest } from "./component-keys";
import { Gap, Held } from "./Dragging";
import { Icon } from "./Icon";
import { labelOf, nameOf, summaryOf } from "./instance-names";
import { Menu, type MenuItem } from "./Menu";
import styles from "./Outline.module.css";
import { RenameInput } from "./RenameInput";
import { atDepth } from "./tree-depth";
import { useDragToMove, type Drag } from "./useDragToMove";

/**
 * The page's components as a tree, in the order visitors will see them.
 *
 * It is the same tree the page JSON holds. A component that can contain
 * others shows them one step further in, by rendering `Level` again for its
 * children, and can be folded shut.
 *
 * Choosing a row opens that component's form. Dragging one moves it, with
 * everything inside it: every place it can go is a `Gap`, and the nearest one
 * opens to make room. The same moves can be made without dragging, from the
 * component's form.
 *
 * A row works the way one does in a file browser. Double-clicking it, or F2,
 * renames the component. Its "more" button and a right click open the same
 * menu: rename, duplicate, move and remove, each with the keys that do it.
 *
 * Each row has a position number (1, 2, 2.1) that only screen readers read
 * out. It gives every row and button its own name, such as "More for Section
 * 2", where the eye has the indent to go by.
 */

type OutlineProps = {
  content: ComponentInstance[];
  definitions: Record<string, ComponentDefinition>;
  issues: IssuesByInstance;
  /** The component whose form is open, if any. */
  selectedId: string | null;
  /** The ids of components that are folded shut, hiding what is inside them. */
  folded: string[];
  onFold: (id: string, shut: boolean) => void;
  onSelect: (id: string) => void;
  /** Moves a component to another place on the page. */
  onMove: (id: string, place: Place) => void;
  /** Told where a component being dragged would go, and null once it is over. */
  onDrag: (dragged: { id: string; place: Place } | null) => void;
  /** Moves a component one place among its neighbours. */
  onStep: (id: string, direction: "up" | "down") => void;
  /** Gives a component a name, or takes its name away with "". */
  onRename: (id: string, name: string) => void;
  /** Puts a copy of a component straight after it. */
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  /** Opens the component picker, to add inside the instance with this id. */
  onAddInside: (parentId: string) => void;
};

/** A row's menu that is open: whose it is, and where on the screen it goes. */
type OpenMenu = { id: string; x: number; y: number };

/**
 * The HTML id of a component's row. The editor uses it to put keyboard focus
 * back on the row after the component's form is closed.
 */
export function rowId(instanceId: string): string {
  return `row-${instanceId}`;
}

export function Outline(props: OutlineProps) {
  const { content, definitions } = props;
  // The component that was just dropped, to show where it landed.
  const [landedId, setLandedId] = useState<string | null>(null);

  const { list, drag, startDrag } = useDragToMove({
    onTarget: (id, gap) => props.onDrag({ id, place: toPlace(gap) }),
    onEnd: () => props.onDrag(null),
    onDrop: (id, gap) => {
      props.onMove(id, toPlace(gap));
      setLandedId(id);
    },
  });
  const dragged = drag ? findInstance(content, drag.id) : undefined;
  // Where it would drop: inside another component, or on the page itself.
  const place = drag ? toPlace(drag.target) : null;

  // The component whose name is being typed over, if any.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<OpenMenu | null>(null);
  const menuNode = menu ? findInstance(content, menu.id) : undefined;

  function endRename(node: ComponentInstance, typed: string | null) {
    setRenamingId(null);
    if (typed === null) return;

    // Without a name, a component is called by its kind. So typing the kind
    // is the way to take a name away, and so is leaving the name empty.
    const name = typed.trim() === labelOf(node, definitions) ? "" : typed.trim();
    if (name !== (node.name ?? "")) props.onRename(node.id, name);
  }

  /** What the menu of one component offers. */
  function menuItems(node: ComponentInstance): MenuItem[] {
    const siblings = findAncestors(content, node.id).at(-1)?.children ?? content;
    const holdsOthers = definitions[node.type]?.acceptsChildren === true;
    // A menu only ever opens in the browser, so `navigator` is there.
    const onMac = navigator.platform.startsWith("Mac");

    const items: MenuItem[] = [
      { label: "Rename", keys: "F2", onChoose: () => setRenamingId(node.id) },
      {
        label: "Duplicate",
        keys: onMac ? "⌘D" : "Ctrl+D",
        onChoose: () => props.onDuplicate(node.id),
      },
    ];
    if (holdsOthers) {
      items.push({
        label: "Add a component inside",
        onChoose: () => props.onAddInside(node.id),
      });
    }
    items.push(
      "line",
      {
        label: "Move up",
        keys: onMac ? "⌥↑" : "Alt+↑",
        disabled: siblings[0] === node,
        onChoose: () => props.onStep(node.id, "up"),
      },
      {
        label: "Move down",
        keys: onMac ? "⌥↓" : "Alt+↓",
        disabled: siblings.at(-1) === node,
        onChoose: () => props.onStep(node.id, "down"),
      },
      "line",
      {
        label: "Remove",
        keys: onMac ? "⌫" : "Delete",
        onChoose: () => props.onRemove(node.id),
      },
    );
    return items;
  }

  return (
    <div
      ref={list}
      className={styles.outline}
      style={{ minHeight: drag?.listHeight }}
      data-drag-list
      data-dragging={drag ? (drag.moved ? "moved" : "lifted") : undefined}
      // Lights up the page's own row, which is outside this list.
      data-into-page={place?.parentId === null || undefined}
      onAnimationEnd={() => setLandedId(null)}
    >
      <Level
        {...props}
        nodes={content}
        parentId={null}
        parentNumber=""
        depth={1}
        drag={drag}
        intoId={place?.parentId ?? null}
        landedId={landedId}
        startDrag={startDrag}
        renamingId={renamingId}
        menuId={menu?.id ?? null}
        startRename={setRenamingId}
        endRename={endRename}
        showMenu={setMenu}
      />

      {drag && dragged && (
        <Held drag={drag}>
          <span className={styles.handle}>
            <Icon name="grip" />
          </span>
          <span className={styles.fold}>
            {definitions[dragged.type]?.acceptsChildren && <Icon name="next" size={12} />}
          </span>
          <span className={styles.select}>
            <RowText node={dragged} definitions={definitions} isFolded problems={0} />
          </span>
        </Held>
      )}

      {menu && menuNode && (
        <Menu
          label={nameOf(menuNode, definitions)}
          x={menu.x}
          y={menu.y}
          items={menuItems(menuNode)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

/** Moves keyboard focus from one row to the row above it (-1) or below (1). */
function focusNextRow(row: HTMLElement, step: -1 | 1) {
  const list = row.closest("[data-drag-list]");
  const rows = [...(list?.querySelectorAll<HTMLElement>('button[id^="row-"]') ?? [])];
  rows[rows.indexOf(row) + step]?.focus();
}

/** A place on the page, as the name of a gap, and back again. */
function toGap(place: Place): string {
  return JSON.stringify([place.parentId, place.beforeId]);
}

function toPlace(gap: string): Place {
  const [parentId, beforeId] = JSON.parse(gap) as [string | null, string | null];
  return { parentId, beforeId };
}

type LevelProps = OutlineProps & {
  nodes: ComponentInstance[];
  /** The component these are inside, or null for the page itself. */
  parentId: string | null;
  /** That component's number, such as "2", or "" for the page. */
  parentNumber: string;
  /** How many steps in from the edge to draw these. */
  depth: number;
  /** What is being dragged, if anything. */
  drag: Drag | null;
  /** The component a drag would drop into, if any. */
  intoId: string | null;
  landedId: string | null;
  startDrag: (press: PointerEvent<HTMLElement>, id: string) => void;
  renamingId: string | null;
  /** The component whose menu is open, if any. */
  menuId: string | null;
  startRename: (id: string) => void;
  /** `typed` is the name as it was typed, or null if it was given up. */
  endRename: (node: ComponentInstance, typed: string | null) => void;
  /** Opens a row's menu, or closes the open one with null. */
  showMenu: (menu: OpenMenu | null) => void;
};

function Level(props: LevelProps) {
  const { nodes, parentId, parentNumber, depth } = props;

  return (
    <>
      {nodes.length > 0 && (
        <ol className={styles.list}>
          {nodes.map((node, index) => (
            <Item
              {...props}
              key={node.id}
              node={node}
              // 1, 2, 3 on the page itself; 2.1, 2.2 inside component 2.
              number={parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`}
            />
          ))}
        </ol>
      )}
      <Gap
        name={toGap({ parentId, beforeId: null })}
        drag={props.drag}
        style={atDepth(depth)}
      />
    </>
  );
}

type ItemProps = LevelProps & { node: ComponentInstance; number: string };

/** One component: its row, and what it holds one step further in. */
function Item(props: ItemProps) {
  const { node, number, definitions, parentId, depth, drag, startDrag } = props;

  // What the row calls it: the name an editor gave it, or else its kind.
  const label = nameOf(node, definitions);
  // Two sections on one page are told apart by number: "Section 2".
  const name = `${label} ${number}`;

  const holdsOthers = definitions[node.type]?.acceptsChildren === true;
  const children = node.children ?? [];
  const isFolded = holdsOthers && props.folded.includes(node.id);
  const isSelected = node.id === props.selectedId;
  const isRenaming = node.id === props.renamingId;
  const hasMenu = node.id === props.menuId;

  /** The keys that work on a row while it has keyboard focus. */
  function handleKey(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    const row = event.currentTarget;
    const asked = keyRequest(event);

    if (asked === "rename") {
      props.startRename(node.id);
    } else if (asked === "duplicate") {
      props.onDuplicate(node.id);
    } else if (asked === "remove") {
      // The row is about to go, and keyboard focus would go with it.
      focusNextRow(row, -1);
      props.onRemove(node.id);
    } else if (asked === "up" || asked === "down") {
      props.onStep(node.id, asked);
    } else if (key === "ArrowUp") {
      focusNextRow(row, -1);
    } else if (key === "ArrowDown") {
      focusNextRow(row, 1);
    } else if (key === "ArrowLeft" && holdsOthers && !isFolded) {
      props.onFold(node.id, true);
    } else if (key === "ArrowRight" && isFolded) {
      props.onFold(node.id, false);
    } else {
      return;
    }
    // Keeps the browser from also acting on the key: Ctrl+D adds a bookmark.
    event.preventDefault();
  }

  return (
    <li style={atDepth(depth)} data-dragged={node.id === drag?.id || undefined}>
      <Gap name={toGap({ parentId, beforeId: node.id })} drag={drag} />

      <div className="drag-item" data-receiving={node.id === props.intoId || undefined}>
        <div
          className={`tree-row ${styles.row}`}
          data-drag-row
          data-selected={isSelected || undefined}
          data-landed={node.id === props.landedId || undefined}
          data-menu-open={hasMenu || undefined}
          onContextMenu={(event) => {
            // While a name is typed, a right click is for copy and paste.
            if (isRenaming) return;
            event.preventDefault();
            // The menu gives focus back to the row when it closes.
            document.getElementById(rowId(node.id))?.focus();
            props.showMenu({ id: node.id, x: event.clientX, y: event.clientY });
          }}
        >
          <span
            className={styles.handle}
            data-drag-handle
            title="Drag to move"
            onPointerDown={(press) => startDrag(press, node.id)}
            aria-hidden="true"
          >
            <Icon name="grip" />
          </span>

          {holdsOthers ? (
            <button
              type="button"
              className={styles.fold}
              aria-expanded={!isFolded}
              aria-label={`What is inside ${name}`}
              onClick={() => props.onFold(node.id, !isFolded)}
            >
              <Icon name="next" size={12} />
            </button>
          ) : (
            <span className={styles.fold} />
          )}

          {isRenaming && (
            <RenameInput
              value={label}
              label={`Name of ${name}`}
              rowId={rowId(node.id)}
              onDone={(typed) => props.endRename(node, typed)}
            />
          )}

          <button
            type="button"
            id={rowId(node.id)}
            className={styles.select}
            // Out of sight while the name is typed, in the same place.
            hidden={isRenaming}
            aria-current={isSelected || undefined}
            onPointerDown={(press) => startDrag(press, node.id)}
            onClick={() => props.onSelect(node.id)}
            onDoubleClick={() => props.startRename(node.id)}
            onKeyDown={handleKey}
          >
            <span className="visually-hidden">{number}</span>{" "}
            <RowText
              node={node}
              definitions={definitions}
              isFolded={isFolded}
              problems={props.issues[node.id]?.length ?? 0}
            />
          </button>

          {/* Drawn only for a row under the pointer or holding keyboard focus,
              and always on a touch screen: see .more in the stylesheet. */}
          <div className={styles.more}>
            <button
              type="button"
              className="icon-button"
              aria-label={`More for ${name}`}
              title="Rename, duplicate, move, remove"
              aria-haspopup="menu"
              aria-expanded={hasMenu}
              onClick={(event) => {
                // The menu opens under the button, and a second press closes it.
                const button = event.currentTarget.getBoundingClientRect();
                props.showMenu(
                  hasMenu ? null : { id: node.id, x: button.left, y: button.bottom + 4 },
                );
              }}
            >
              <Icon name="more" />
            </button>
          </div>

          {/* A component that is folded shut can still be dropped into. This
              gap is half way down its row, between the ones before and after. */}
          {isFolded && (
            <Gap
              name={toGap({ parentId: node.id, beforeId: null })}
              drag={drag}
              staysShut
            />
          )}
        </div>

        {holdsOthers && !isFolded && (
          <div className="tree-children">
            <Level
              {...props}
              nodes={children}
              parentId={node.id}
              parentNumber={number}
              depth={depth + 1}
            />
            <button
              type="button"
              className={`tree-row ${styles.addInside}`}
              style={atDepth(depth + 1)}
              onClick={() => props.onAddInside(node.id)}
            >
              <Icon name="add" size={14} />
              <span className="tree-label">Add inside {label}</span>
              <span className="visually-hidden"> {number}</span>
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

type RowTextProps = {
  node: ComponentInstance;
  definitions: Record<string, ComponentDefinition>;
  /** Whether what it holds is out of sight, and so needs counting. */
  isFolded: boolean;
  /** How many problems it has. */
  problems: number;
};

/** What a row says: what the component is called, a note, and anything to flag. */
function RowText({ node, definitions, isFolded, problems }: RowTextProps) {
  const holdsOthers = definitions[node.type]?.acceptsChildren === true;
  // Beside a name an editor gave, the note says what kind of component it is.
  // Otherwise the name already says that, and the note is the summary: a card
  // grid's title, or a section's layout.
  const note = node.name ? labelOf(node, definitions) : summaryOf(node, definitions);
  const inside = node.children?.length ?? 0;

  // The spaces keep the parts apart when a screen reader reads them out:
  // "1.1 Card grid Meet the squad".
  return (
    <span className="tree-text">
      <span className="tree-label" data-strong={holdsOthers || undefined}>
        {nameOf(node, definitions)}
      </span>{" "}
      {note && <span className="tree-note">{note}</span>}{" "}
      {isFolded && inside > 0 && (
        <span className={styles.count}>
          {inside}
          <span className="visually-hidden"> inside</span>
        </span>
      )}{" "}
      {problems > 0 && (
        <span className="problem-count">
          <Icon name="problem" size={14} />
          {problems} {problems === 1 ? "problem" : "problems"}
        </span>
      )}
    </span>
  );
}
