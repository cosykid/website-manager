import { cardGridDefinition } from "./card-grid/definition";
import { sectionDefinition } from "./section/definition";
import type { ComponentDefinition } from "./types";

/**
 * Every component an editor can place on a page, in the order the manager
 * offers them. This file imports only data, never React components, so the
 * manager can use it without pulling in the site's rendering code.
 */
const all = [sectionDefinition, cardGridDefinition];

/** The component names in the library: "section" | "card-grid" | ... */
export type ComponentTypeName = (typeof all)[number]["type"];

/** Definitions by `type`, for looking one up from a page's JSON. */
export const definitions: Record<string, ComponentDefinition> =
  Object.fromEntries(all.map((definition) => [definition.type, definition]));
