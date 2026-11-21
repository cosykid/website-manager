/**
 * How a component describes itself to the manager.
 *
 * A definition is plain data: no functions and no React. The manager reads it
 * to draw the editing form, and the server reads the same data to check what
 * an editor entered. Adding a component never means writing a form.
 *
 * To support a new kind of input, add a type to `Field` below. TypeScript then
 * reports an error in each place that must handle it: `validate.ts` (its
 * empty value and its rules) and `src/manager/FieldEditor.tsx` (the input to
 * draw). See `unhandledKind` at the end of this file.
 */

type FieldBase = {
  /** Shown above the input. */
  label: string;
  /** An optional hint shown under the input. */
  help?: string;
};

/** A line of text, or a paragraph when `multiline` is set. */
export type TextField = FieldBase & {
  kind: "text";
  required?: boolean;
  multiline?: boolean;
  /** An example shown in the empty input. */
  placeholder?: string;
};

/** A link or image address: a path on this site ("/about") or a full web address. */
export type UrlField = FieldBase & {
  kind: "url";
  required?: boolean;
  placeholder?: string;
};

/** One choice from a fixed list. */
export type SelectField = FieldBase & {
  kind: "select";
  options: { value: string; label: string }[];
  /** The option used until an editor picks one. Must be one of `options`. */
  default: string;
};

/** Fields that belong together, such as an image's address and alt text. */
export type GroupField = FieldBase & {
  kind: "group";
  fields: Record<string, Field>;
  /** An optional group can be left out entirely, such as a card with no link. */
  optional?: boolean;
};

/** A repeatable list, such as the cards in a card grid. */
export type ListField = FieldBase & {
  kind: "list";
  /** What every entry looks like. */
  item: Field;
  /** What one entry is called, lowercase, for buttons like "Add card". */
  itemLabel: string;
  /** For a list of groups: the field whose value names an entry in the editor. */
  itemTitleField?: string;
};

export type Field = TextField | UrlField | SelectField | GroupField | ListField;

/**
 * Goes in the `default` branch of every `switch` over `field.kind`.
 *
 * While each kind has its own `case`, no field can reach the default branch,
 * so its type there is `never` and this call compiles. Add a kind to `Field`
 * without adding a `case`, and TypeScript reports an error on the call. That
 * is how the compiler lists every place a new kind of field must be handled.
 */
export function unhandledKind(field: never): never {
  throw new Error(`No case for this kind of field: ${JSON.stringify(field)}`);
}

export type ComponentDefinition = {
  /**
   * The name stored in page JSON. Treat it as permanent: renaming it orphans
   * every saved instance.
   */
  type: string;
  /** What editors see in the manager. */
  label: string;
  /** One sentence shown when choosing a component to add. */
  description: string;
  /** The props an editor can change, in the order the form shows them. */
  fields: Record<string, Field>;
  /** True for components that hold other components. */
  acceptsChildren?: boolean;
  /** The field whose value is shown beside the component in the page outline. */
  summaryField?: string;
};

/**
 * Declares a component definition. It returns exactly what it is given. It
 * exists so TypeScript checks the shape and remembers the exact `type` string,
 * which lets components.tsx prove every definition has a React component.
 */
export function defineComponent<Type extends string>(
  definition: ComponentDefinition & { type: Type },
): ComponentDefinition & { type: Type } {
  return definition;
}
