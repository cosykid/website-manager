import { imageFields } from "../image-fields";
import { defineComponent } from "../types";

export const bannerDefinition = defineComponent({
  type: "banner",
  label: "Banner",
  description: "A large heading with a short message, and an optional button and image.",
  summaryField: "heading",
  fields: {
    heading: {
      kind: "text",
      label: "Heading",
      required: true,
      placeholder: "Season launch",
    },
    message: {
      kind: "text",
      label: "Message",
      multiline: true,
      placeholder: "One or two sentences under the heading.",
    },
    button: {
      kind: "group",
      label: "Button",
      optional: true,
      fields: {
        label: {
          kind: "text",
          label: "Button text",
          required: true,
          placeholder: "See the fixtures",
        },
        href: {
          kind: "url",
          label: "Button address",
          required: true,
          placeholder: "/fixtures or https://…",
        },
      },
    },
    image: {
      kind: "group",
      label: "Image",
      optional: true,
      fields: imageFields,
    },
  },
});
