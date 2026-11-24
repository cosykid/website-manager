"use client";

import { useState, type PointerEvent } from "react";
import type { ComponentDefinition } from "@/library/types";
import type { IssuesByInstance } from "@/library/validate";
import { findInstance, type Place } from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { Gap, Held } from "./Dragging";
import { Icon } from "./Icon";
import { labelOf, summaryOf } from "./instance-names";
import styles from "./Outline.module.css";
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
  /** Told where a component being dragged would go, and null once it is over. */
  onDrag: (dragged: { id: string; place: Place } | null) => void;
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
  /** What is being dragged, if anything. */
  drag: Drag | null;
  /** The component a drag would drop into, if any. */
  intoId: string | null;
  landedId: string | null;
  startDrag: (press: PointerEvent<HTMLElement>, id: string) => void;
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

  const label = labelOf(node, definitions);
  // Two sections on one page are told apart by number: "Section 2".
  const name = `${label} ${number}`;

  const holdsOthers = definitions[node.type]?.acceptsChildren === true;
  const children = node.children ?? [];
  const isFolded = holdsOthers && props.folded.includes(node.id);
  const isSelected = node.id === props.selectedId;

  return (
    <li style={atDepth(depth)} data-dragged={node.id === drag?.id || undefined}>
      <Gap name={toGap({ parentId, beforeId: node.id })} drag={drag} />

      <div className="drag-item" data-receiving={node.id === props.intoId || undefined}>
        <div
          className={`tree-row ${styles.row}`}
          data-drag-row
          data-selected={isSelected || undefined}
          data-landed={node.id === props.landedId || undefined}
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

          <button
            type="button"
            id={rowId(node.id)}
            className={styles.select}
            aria-current={isSelected || undefined}
            onPointerDown={(press) => startDrag(press, node.id)}
            onClick={() => props.onSelect(node.id)}
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

/** What a row says: the kind of component, its summary, and anything to note. */
function RowText({ node, definitions, isFolded, problems }: RowTextProps) {
  const holdsOthers = definitions[node.type]?.acceptsChildren === true;
  const summary = summaryOf(node, definitions);
  const inside = node.children?.length ?? 0;

  // The spaces keep the parts apart when a screen reader reads them out:
  // "1.1 Card grid Meet the squad".
  return (
    <span className="tree-text">
      <span className="tree-label" data-strong={holdsOthers || undefined}>
        {labelOf(node, definitions)}
      </span>{" "}
      {summary && <span className="tree-note">{summary}</span>}{" "}
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
