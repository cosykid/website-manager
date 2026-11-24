import { components } from "@/library/components";
import { definitions, type ComponentTypeName } from "@/library/definitions";
import { fillGroup, validateGroup } from "@/library/validate";
import type { ComponentInstance } from "@/page-model/types";

/**
 * Turns a page's tree of component instances into React elements.
 *
 * This is the whole renderer: look up each instance's `type`, render that
 * component with the stored props, and do the same for its children. It
 * imports nothing from the manager.
 */
export function RenderTree({ nodes }: { nodes: ComponentInstance[] }) {
  return nodes.map((node) => <RenderInstance key={node.id} node={node} />);
}

function RenderInstance({ node }: { node: ComponentInstance }) {
  const resolved = resolveInstance(node);

  // Leave a gap rather than fail the page.
  if (!resolved.ok) {
    console.warn(`Skipped "${node.id}" (${node.type}): ${resolved.problem}`);
    return null;
  }

  const { Component, props, acceptsChildren } = resolved;
  return (
    <Component {...props}>
      {acceptsChildren && node.children ? (
        <RenderTree nodes={node.children} />
      ) : null}
    </Component>
  );
}

/** What it takes to draw one instance, or the reason it cannot be drawn. */
type Resolved =
  | {
      ok: true;
      Component: (typeof components)[ComponentTypeName];
      props: Record<string, unknown>;
      acceptsChildren: boolean;
    }
  | { ok: false; problem: string };

/**
 * Finds the component for an instance and gets its props ready.
 *
 * The public page and the editor's preview both draw from this, so the two
 * cannot disagree about which instances are fit to show.
 */
export function resolveInstance(node: ComponentInstance): Resolved {
  const definition = definitions[node.type];
  const Component = components[node.type as ComponentTypeName];

  // A page can outlive a component.
  if (!definition || !Component) {
    return { ok: false, problem: `There is no component called "${node.type}".` };
  }

  // Fill in any prop the page was saved without, then make sure the result is
  // something the component can draw. Stored JSON is never trusted blindly.
  const props = fillGroup(definition.fields, node.props);
  const issues = validateGroup(definition.fields, props);
  if (issues.length > 0) return { ok: false, problem: issues[0].message };

  return {
    ok: true,
    Component,
    props,
    acceptsChildren: definition.acceptsChildren === true,
  };
}
