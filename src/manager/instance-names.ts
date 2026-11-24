import type { ComponentDefinition } from "@/library/types";
import type { ComponentInstance } from "@/page-model/types";

/** What the manager calls a component on a page. */

type Definitions = Record<string, ComponentDefinition>;

/** The kind of component it is, such as "Card grid". */
export function labelOf(node: ComponentInstance, definitions: Definitions): string {
  return definitions[node.type]?.label ?? "Unknown component";
}

/**
 * The short text that tells it from others of its kind, taken from the field
 * its definition names: a card grid's title, or a section's chosen layout.
 */
export function summaryOf(node: ComponentInstance, definitions: Definitions): string {
  const definition = definitions[node.type];
  if (!definition) return node.type;
  if (!definition.summaryField) return "";

  const field = definition.fields[definition.summaryField];
  const value = node.props[definition.summaryField];
  if (!field || typeof value !== "string") return "";

  if (field.kind === "select") {
    return field.options.find((option) => option.value === value)?.label ?? "";
  }
  return value;
}
