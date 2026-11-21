import { defineComponent } from "../types";

export const sectionDefinition = defineComponent({
  type: "section",
  label: "Section",
  description: "Groups other components and sets their layout and background.",
  acceptsChildren: true,
  summaryField: "layout",
  fields: {
    layout: {
      kind: "select",
      label: "Layout",
      help: "Two columns sit side by side on wide screens and stack on narrow ones.",
      default: "full",
      options: [
        { value: "full", label: "Full width" },
        { value: "two-column", label: "Two columns" },
      ],
    },
    background: {
      kind: "select",
      label: "Background",
      help: "Subtle and brand colours come from the site's theme.",
      default: "none",
      options: [
        { value: "none", label: "None" },
        { value: "light", label: "Subtle" },
        { value: "brand", label: "Brand" },
      ],
    },
  },
});
