import type { ComponentType } from "react";
import { CardGrid } from "./card-grid/CardGrid";
import type { ComponentTypeName } from "./definitions";
import { Section } from "./section/Section";

/**
 * The React component for each definition.
 *
 * Because the keys are typed as ComponentTypeName, TypeScript refuses to
 * build if a definition is added to definitions.ts without a component here.
 *
 * `any` is deliberate. Props come from stored JSON and are checked against
 * the definition's fields just before rendering (see RenderTree). TypeScript
 * cannot see that link, so this is the one place the types are loosened.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const components: Record<ComponentTypeName, ComponentType<any>> = {
  section: Section,
  "card-grid": CardGrid,
};
