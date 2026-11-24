"use client";

import type { PointerEvent } from "react";
import type { ComponentDefinition } from "@/library/types";
import type { IssuesByInstance } from "@/library/validate";
import { findInstance, moveInstanceTo, type Place } from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { Gap, Held } from "./Dragging";
import { Icon } from "./Icon";
import { labelOf, summaryOf } from "./instance-names";
import styles from "./Outline.module.css";
import { atDepth } from "./tree-depth";
import { useDragToMove } from "./useDragToMove";

/**
 * The page's components as a tree, in the order visitors will see them.
 *
 * It is the same tree the page JSON holds. A component that can contain
 * others shows them one step further in, by rendering `Level` again for its
 * children, and can be folded shut.
 *
 * Choosing a row opens that component's form. Dragging a row moves it: every
 * place it can go is a `Gap`, and the gap nearest the pointer shows a line.
 * The same moves can be made without dragging, from the component's form.
 *
 * Each row has a position number (1, 2, 2.1) that only screen readers read
 * out. It gives every row and button its own name, such as "Remove Section 2",
 * where the eye has the indent to go by.
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
  onRemove: (id: string) => void;
  /** Opens the component picker, to add inside the instance with this id. */
  onAddInside: (parentId: string) => void;
};

/**
 * The HTML id of a component's row. The editor uses it to put keyboard focus
 * back on the row after the component's form is closed.
 */
export function rowId(instanceId: string): string {
  return `row-${instanceId}`;
}

export function Outline(props: OutlineProps) {
  const { content, definitions } = props;
  const { list, drag, startDrag } = useDragToMove((id, gap) =>
    props.onMove(id, toPlace(gap)),
  );

  const dragged = drag ? findInstance(content, drag.id) : undefined;
  // Show a line only where letting go would change the page. Either side of
  // where the component already is, it would not.
  const changesPage =
    drag?.gap && moveInstanceTo(content, drag.id, toPlace(drag.gap)) !== content;

  return (
    <div
      ref={list}
      className={styles.outline}
      data-drag-list
      data-dragging={drag ? true : undefined}
    >
      <Level
        {...props}
        nodes={content}
        parentId={null}
        parentNumber=""
        depth={1}
        draggedId={drag?.id ?? null}
        target={changesPage ? drag.gap : null}
        startDrag={startDrag}
      />

      {drag && dragged && (
        <Held drag={drag}>
          {labelOf(dragged, definitions)} <span>{summaryOf(dragged, definitions)}</span>
        </Held>
      )}
    </div>
  );
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
  draggedId: string | null;
  /** The gap a drag would drop into now. */
  target: string | null;
  startDrag: (press: PointerEvent<HTMLElement>, id: string) => void;
};

function Level(props: LevelProps) {
  const { nodes, parentId, parentNumber, depth, target } = props;

  return (
    <>
      {nodes.length > 0 && (
        <ol className={styles.list}>
          {nodes.map((node, index) => (
            <li key={node.id} data-dragged={node.id === props.draggedId || undefined}>
              <Gap
                name={toGap({ parentId, beforeId: node.id })}
                target={target}
                style={atDepth(depth)}
              />
              <Row
                {...props}
                node={node}
                // 1, 2, 3 on the page itself; 2.1, 2.2 inside component 2.
                number={parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`}
              />
            </li>
          ))}
        </ol>
      )}
      <Gap
        name={toGap({ parentId, beforeId: null })}
        target={target}
        style={atDepth(depth)}
      />
    </>
  );
}

type RowProps = LevelProps & { node: ComponentInstance; number: string };

function Row(props: RowProps) {
  const { node, number, definitions, depth, target } = props;

  const label = labelOf(node, definitions);
  const summary = summaryOf(node, definitions);
  // Two sections on one page are told apart by number: "Section 2".
  const name = `${label} ${number}`;
  const problems = props.issues[node.id]?.length ?? 0;

  const holdsOthers = definitions[node.type]?.acceptsChildren === true;
  const children = node.children ?? [];
  const isFolded = holdsOthers && props.folded.includes(node.id);

  return (
    <>
      <div
        className={`tree-row ${styles.row}`}
        style={atDepth(depth)}
        data-selected={node.id === props.selectedId || undefined}
        // The component that a drag would drop into.
        data-receiving={(target && toPlace(target).parentId === node.id) || undefined}
      >
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

        {/* Says what kind of row this is. Under the pointer, and always on a
            touch screen, it turns into a handle to drag the row by. */}
        <span
          className={styles.handle}
          data-drag-handle
          onPointerDown={(press) => props.startDrag(press, node.id)}
          aria-hidden="true"
        >
          <Icon name={holdsOthers ? "container" : "component"} />
          <Icon name="grip" />
        </span>

        <button
          type="button"
          id={rowId(node.id)}
          className={styles.select}
          aria-current={node.id === props.selectedId || undefined}
          onPointerDown={(press) => props.startDrag(press, node.id)}
          onClick={() => props.onSelect(node.id)}
        >
          {/* The spaces keep the parts apart when a screen reader reads the
              button out: "1.1 Card grid Meet the squad". */}
          <span className="tree-text">
            <span className="visually-hidden">{number}</span>{" "}
            <span className="tree-label" data-strong={holdsOthers || undefined}>
              {label}
            </span>{" "}
            {summary && <span className="tree-note">{summary}</span>}{" "}
            {isFolded && children.length > 0 && (
              <span className={styles.count}>
                {children.length}
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
        </button>

        {/* Drawn only for a row under the pointer or holding keyboard focus,
            and always on a touch screen: see .remove in the stylesheet. */}
        <div className={styles.remove}>
          <button
            type="button"
            className="icon-button"
            aria-label={`Remove ${name}`}
            onClick={() => props.onRemove(node.id)}
          >
            <Icon name="remove" />
          </button>
        </div>

        {/* A component that is folded shut can still be dropped into. This
            gap is half way down its row, between the ones above and below. */}
        {isFolded && (
          <Gap
            name={toGap({ parentId: node.id, beforeId: null })}
            target={target}
            style={atDepth(depth + 1)}
          />
        )}
      </div>

      {holdsOthers && !isFolded && (
        <div className="tree-children" style={atDepth(depth)}>
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
    </>
  );
}
