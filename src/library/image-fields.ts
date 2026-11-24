import type { Field } from "./types";

/**
 * The fields of an image, for any component that shows one. They are in one
 * place so that every component asks for an image, and for the words that
 * stand in for it, in the same way.
 */
export const imageFields: Record<string, Field> = {
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
};
