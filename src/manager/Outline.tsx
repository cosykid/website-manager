"use client";

import type { ComponentDefinition } from "@/library/types";
import type { IssuesByInstance } from "@/library/validate";
import type { ComponentInstance } from "@/page-model/types";
import { Icon } from "./Icon";
import styles from "./Outline.module.css";

/**
 * The page as a numbered outline, in the order visitors will see it.
 *
 * It is the same tree the page JSON holds: a component that can contain
 * others shows them indented beneath it, by rendering this outline again for
 * its children.
 */

type OutlineProps = {
  nodes: ComponentInstance[];
  /**
   * The number of the component these nodes sit inside, such as "2". It is
   * left out at the top level of the page.
   */
  parentNumber?: string;
  definitions: Record<string, ComponentDefinition>;
  selectedId: string | null;
  issues: IssuesByInstance;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onRemove: (id: string) => void;
  /** Opens the component picker, to add inside the instance with this id. */
  onAddInside: (parentId: string) => void;
};

export function Outline(props: OutlineProps) {
  const { nodes, parentNumber, definitions, selectedId, issues } = props;
  if (nodes.length === 0) return null;

  return (
    <ol className={styles.list}>
      {nodes.map((node, index) => {
        const definition = definitions[node.type];
        const label = definition?.label ?? "Unknown component";
        const summary = definition ? summaryOf(node, definition) : node.type;
        const isSelected = node.id === selectedId;
        const problems = issues[node.id]?.length ?? 0;

        // 1, 2, 3 at the top of the page; 2.1, 2.2 inside component 2.
        const number = parentNumber
          ? `${parentNumber}.${index + 1}`
          : `${index + 1}`;
        // Two sections on one page are told apart by number: "Section 2".
        const name = `${label} ${number}`;

        return (
          <li key={node.id}>
            <div className={styles.row} data-selected={isSelected || undefined}>
              <button
                type="button"
                className={styles.select}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => props.onSelect(node.id)}
              >
                {/* The spaces keep the parts apart when a screen reader reads
                    the button out: "1.1 Card grid Meet the squad". */}
                <span className={styles.number}>{number}</span>{" "}
                <span className={styles.text}>
                  <span className={styles.label}>{label}</span>{" "}
                  {summary && <span className={styles.summary}>{summary}</span>}{" "}
                  {problems > 0 && (
                    <span className={styles.problems}>
                      <Icon name="problem" size={14} />
                      {problems} {problems === 1 ? "problem" : "problems"}
                    </span>
                  )}
                </span>
              </button>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${name} up`}
                  disabled={index === 0}
                  onClick={() => props.onMove(node.id, "up")}
                >
                  <Icon name="up" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Move ${name} down`}
                  disabled={index === nodes.length - 1}
                  onClick={() => props.onMove(node.id, "down")}
                >
                  <Icon name="down" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Remove ${name}`}
                  onClick={() => props.onRemove(node.id)}
                >
                  <Icon name="remove" />
                </button>
              </div>
            </div>

            {definition?.acceptsChildren && (
              <div className={styles.children}>
                <Outline
                  {...props}
                  nodes={node.children ?? []}
                  parentNumber={number}
                />
                <button
                  type="button"
                  className={styles.addInside}
                  onClick={() => props.onAddInside(node.id)}
                >
                  <Icon name="add" size={14} />
                  Add inside {label}
                  <span className="visually-hidden"> {number}</span>
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The short text beside a component's name, taken from the field its
 * definition names: a card grid's title, or a section's chosen layout.
 */
function summaryOf(
  node: ComponentInstance,
  definition: ComponentDefinition,
): string {
  if (!definition.summaryField) return "";

  const field = definition.fields[definition.summaryField];
  const value = node.props[definition.summaryField];
  if (!field || typeof value !== "string") return "";

  if (field.kind === "select") {
    return field.options.find((option) => option.value === value)?.label ?? "";
  }
  return value;
}
