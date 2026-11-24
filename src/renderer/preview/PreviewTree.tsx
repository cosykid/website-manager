import type { ReactNode } from "react";
import { definitions } from "@/library/definitions";
import type { ComponentInstance } from "@/page-model/types";
import { resolveInstance } from "../RenderTree";
import styles from "./Preview.module.css";

type PreviewTreeProps = {
  nodes: ComponentInstance[];
  /** The component whose form is open in the editor, if any. */
  selectedId: string | null;
};

/**
 * RenderTree, for the editor's preview. It draws the same components from the
 * same checked props (see resolveInstance). Two things differ:
 *
 * - Every instance is wrapped in an element that carries its id. That is how
 *   a click is traced back to a component, and how the open one is marked.
 * - Where the public page would leave a gap, this leaves a note, so an editor
 *   can see that a component is there and why it is not showing.
 */
export function PreviewTree({ nodes, selectedId }: PreviewTreeProps) {
  return nodes.map((node) => (
    <PreviewInstance key={node.id} node={node} selectedId={selectedId} />
  ));
}

function PreviewInstance({
  node,
  selectedId,
}: {
  node: ComponentInstance;
  selectedId: string | null;
}) {
  const resolved = resolveInstance(node);
  const label = definitions[node.type]?.label ?? "Unknown component";

  let drawn: ReactNode;
  if (!resolved.ok) {
    // For example: "Banner is not shown. Heading is required."
    drawn = (
      <p className={styles.note}>
        <strong>{label}</strong> is not shown. {resolved.problem}
      </p>
    );
  } else {
    const { Component, props, acceptsChildren } = resolved;
    const children = node.children ?? [];

    drawn = (
      <Component {...props}>
        {acceptsChildren && children.length > 0 && (
          <PreviewTree nodes={children} selectedId={selectedId} />
        )}
        {/* An empty Section takes up almost no room. The note gives the
            editor something to see and to click. */}
        {acceptsChildren && children.length === 0 && (
          <p className={styles.note}>This {label.toLowerCase()} is empty.</p>
        )}
      </Component>
    );
  }

  return (
    <div
      className={styles.instance}
      data-instance-id={node.id}
      data-selected={node.id === selectedId || undefined}
    >
      {drawn}
    </div>
  );
}
