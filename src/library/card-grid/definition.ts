import { defineComponent } from "../types";

export const cardGridDefinition = defineComponent({
  type: "card-grid",
  label: "Card grid",
  description: "A title above a grid of cards. Each card has an image, a heading and an optional link.",
  summaryField: "title",
  fields: {
    title: {
      kind: "text",
      label: "Title",
      required: true,
      placeholder: "Meet the team",
    },
    cards: {
      kind: "list",
      label: "Cards",
      itemLabel: "card",
      itemTitleField: "heading",
      item: {
        kind: "group",
        label: "Card",
        fields: {
          heading: {
            kind: "text",
            label: "Heading",
            required: true,
            placeholder: "A name or headline",
          },
          image: {
            kind: "group",
            label: "Image",
            fields: {
              url: {
                kind: "image",
                label: "Image address",
                required: true,
              },
              alt: {
                kind: "text",
                label: "Alt text",
                help: "Describes the image for people who can't see it. Leave empty if the image is only decoration.",
              },
            },
          },
          link: {
            kind: "group",
            label: "Link",
            optional: true,
            fields: {
              label: {
                kind: "text",
                label: "Link text",
                required: true,
                placeholder: "View profile",
              },
              href: {
                kind: "url",
                label: "Link address",
                required: true,
                placeholder: "/about or https://…",
              },
            },
          },
        },
      },
    },
  },
});
