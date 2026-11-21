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
  const definition = definitions[node.type];
  const Component = components[node.type as ComponentTypeName];

  // A page can outlive a component. Leave the gap rather than fail the page.
  if (!definition || !Component) {
    console.warn(`Skipped "${node.id}": no component called "${node.type}".`);
    return null;
  }

  // Fill in any prop the page was saved without, then make sure the result is
  // something the component can draw. Stored JSON is never trusted blindly.
  const props = fillGroup(definition.fields, node.props);
  const issues = validateGroup(definition.fields, props);
  if (issues.length > 0) {
    console.warn(`Skipped "${node.id}" (${node.type}): ${issues[0].message}`);
    return null;
  }

  return (
    <Component {...props}>
      {definition.acceptsChildren && node.children ? (
        <RenderTree nodes={node.children} />
      ) : null}
    </Component>
  );
}
