import { isPlainObject } from "@/page-model/shape";
import type { ComponentInstance } from "@/page-model/types";
import { unhandledKind, type ComponentDefinition, type Field } from "./types";

/**
 * Checks values against field descriptions.
 *
 * The manager runs this in the browser to show problems as they are fixed, the
 * save action runs it again on the server (a browser can send anything), and
 * the renderer runs it before drawing a component.
 */

/** One problem with one value. `path` says where, for example "cards.2.heading". */
export type Issue = { path: string; message: string };

/** Problems on a page, keyed by the id of the instance they belong to. */
export type IssuesByInstance = Record<string, Issue[]>;

/** The value a field holds before an editor touches it. */
export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case "text":
    case "url":
      return "";
    case "select":
      return field.default;
    case "list":
      return [];
    case "group":
      // An optional group starts out absent, e.g. a card with no link yet.
      return field.optional ? undefined : fillGroup(field.fields, {});
    default:
      return unhandledKind(field);
  }
}

/**
 * Returns a copy of `value` with every gap filled by the field's empty value,
 * and anything the fields don't describe left out.
 *
 * This is what lets a page saved before a prop existed keep rendering: the
 * component still receives every prop it expects.
 */
export function fillGroup(
  fields: Record<string, Field>,
  value: Record<string, unknown>,
): Record<string, unknown> {
  const filled: Record<string, unknown> = {};

  for (const [name, field] of Object.entries(fields)) {
    const fieldValue = fillValue(field, value[name]);
    if (fieldValue !== undefined) filled[name] = fieldValue;
  }

  return filled;
}

function fillValue(field: Field, value: unknown): unknown {
  if (value === undefined || value === null) return emptyValue(field);

  if (field.kind === "group" && isPlainObject(value)) {
    return fillGroup(field.fields, value);
  }
  if (field.kind === "list" && Array.isArray(value)) {
    return value.map((item) => fillValue(field.item, item));
  }
  return value;
}

/** Runs fillGroup over the props of every instance on a page. */
export function fillTree(
  nodes: ComponentInstance[],
  definitions: Record<string, ComponentDefinition>,
): ComponentInstance[] {
  return nodes.map((node) => {
    const definition = definitions[node.type];
    const filled: ComponentInstance = {
      id: node.id,
      type: node.type,
      // An instance of a component that no longer exists is kept as it is.
      props: definition ? fillGroup(definition.fields, node.props) : node.props,
    };
    if (node.children) filled.children = fillTree(node.children, definitions);
    return filled;
  });
}

/** Checks every field of a group, such as a whole component's props. */
export function validateGroup(
  fields: Record<string, Field>,
  value: Record<string, unknown>,
  parentPath = "",
): Issue[] {
  return Object.entries(fields).flatMap(([name, field]) =>
    validateValue(field, value[name], parentPath ? `${parentPath}.${name}` : name),
  );
}

function validateValue(field: Field, value: unknown, path: string): Issue[] {
  switch (field.kind) {
    case "text": {
      if (typeof value !== "string") {
        return [{ path, message: `${field.label} must be text.` }];
      }
      if (field.required && value.trim() === "") {
        return [{ path, message: `${field.label} is required.` }];
      }
      return [];
    }

    case "url": {
      if (typeof value !== "string") {
        return [{ path, message: `${field.label} must be text.` }];
      }
      if (value.trim() === "") {
        return field.required
          ? [{ path, message: `${field.label} is required.` }]
          : [];
      }
      if (!isSafeAddress(value)) {
        return [{ path, message: `${field.label} must start with / or https://.` }];
      }
      return [];
    }

    case "select": {
      const isAnOption = field.options.some((option) => option.value === value);
      return isAnOption
        ? []
        : [{ path, message: `Choose one of the ${field.label.toLowerCase()} options.` }];
    }

    case "group": {
      if (value === undefined) {
        return field.optional
          ? []
          : [{ path, message: `${field.label} is missing.` }];
      }
      if (!isPlainObject(value)) {
        return [{ path, message: `${field.label} is not in the expected shape.` }];
      }
      return validateGroup(field.fields, value, path);
    }

    case "list": {
      if (!Array.isArray(value)) {
        return [{ path, message: `${field.label} must be a list.` }];
      }
      return value.flatMap((item, index) =>
        validateValue(field.item, item, `${path}.${index}`),
      );
    }

    default:
      return unhandledKind(field);
  }
}

/**
 * Allows a path on the same site ("/about") or an http(s) address. Anything
 * else is refused, which keeps out addresses like "javascript:..." that would
 * run code when a visitor clicks the link.
 */
export function isSafeAddress(value: string): boolean {
  if (value.startsWith("/")) return !value.startsWith("//");
  if (!/^https?:\/\//i.test(value)) return false;
  return URL.canParse(value);
}

/**
 * Checks every instance on a page against its definition. The result has an
 * entry only for instances with problems, so an empty object means the page
 * is fine.
 */
export function validateTree(
  nodes: ComponentInstance[],
  definitions: Record<string, ComponentDefinition>,
): IssuesByInstance {
  const result: IssuesByInstance = {};

  for (const node of nodes) {
    const definition = definitions[node.type];

    if (!definition) {
      result[node.id] = [
        { path: "", message: `"${node.type}" is not a component in the library.` },
      ];
      continue;
    }

    const issues = validateGroup(definition.fields, node.props);
    if (node.children && !definition.acceptsChildren) {
      issues.push({
        path: "",
        message: `${definition.label} cannot contain other components.`,
      });
    }
    if (issues.length > 0) result[node.id] = issues;

    if (node.children) {
      Object.assign(result, validateTree(node.children, definitions));
    }
  }

  return result;
}
