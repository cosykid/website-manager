"use client";

import type { ComponentDefinition } from "@/library/types";
import { findPlace } from "@/page-model/tree";
import type { ComponentInstance } from "@/page-model/types";
import { labelOf, summaryOf } from "./instance-names";

type PlacedInProps = {
  /** The component to move. */
  id: string;
  content: ComponentInstance[];
  definitions: Record<string, ComponentDefinition>;
  /** Moves it inside another component, or on to the page itself (null). */
  onMove: (parentId: string | null) => void;
};

/**
 * Says what a component is inside, and moves it somewhere else.
 *
 * Dragging in the list does the same. This is the way for anyone who cannot
 * drag, or is using the keyboard.
 */
export function PlacedIn({ id, content, definitions, onMove }: PlacedInProps) {
  const choices = placesFor(id, content, definitions);
  if (choices.length === 0) return null;

  return (
    <div className="field">
      <label className="label" htmlFor="placed-in">
        Placed in
      </label>
      <select
        id="placed-in"
        className="input"
        value={findPlace(content, id)?.parentId ?? ""}
        aria-describedby="placed-in-help"
        onChange={(event) => onMove(event.target.value || null)}
      >
        <option value="">The page itself</option>
        {choices.map((choice) => (
          <option key={choice.id} value={choice.id}>
            {choice.name}
          </option>
        ))}
      </select>
      <p className="help" id="placed-in-help">
        It moves to the end of the place you choose.
      </p>
    </div>
  );
}

/** Every component that could hold this one, named as screen readers hear it. */
function placesFor(
  id: string,
  nodes: ComponentInstance[],
  definitions: Record<string, ComponentDefinition>,
  parentNumber = "",
): { id: string; name: string }[] {
  return nodes.flatMap((node, index) => {
    const holdsOthers = definitions[node.type]?.acceptsChildren === true;
    // A component cannot go inside itself, or inside anything it holds.
    if (!holdsOthers || node.id === id) return [];

    const number = parentNumber ? `${parentNumber}.${index + 1}` : `${index + 1}`;
    const summary = summaryOf(node, definitions);
    const name = `${labelOf(node, definitions)} ${number}`;

    return [
      { id: node.id, name: summary ? `${name} (${summary})` : name },
      ...placesFor(id, node.children ?? [], definitions, number),
    ];
  });
}
