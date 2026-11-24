import assert from "node:assert/strict";
import { test } from "node:test";
import { isDraftMessage, isPreviewMessage } from "./preview";

test("a draft with a well-formed page is accepted, with or without a selection", () => {
  const content = [
    { id: "wrapper", type: "section", props: {}, children: [] },
    { id: "intro", type: "banner", props: { heading: "Welcome" } },
  ];

  assert.equal(isDraftMessage({ type: "draft", content, selectedId: "intro" }), true);
  assert.equal(isDraftMessage({ type: "draft", content, selectedId: null }), true);
  assert.equal(isDraftMessage({ type: "draft", content: [], selectedId: null }), true);
});

test("a draft is refused when its page or its selection is malformed", () => {
  const content = [{ id: "intro", type: "banner", props: {} }];

  // Not a tree of instances: an instance without an id, and two with the same id.
  assert.equal(
    isDraftMessage({ type: "draft", content: [{ type: "banner", props: {} }], selectedId: null }),
    false,
  );
  assert.equal(
    isDraftMessage({ type: "draft", content: [...content, ...content], selectedId: null }),
    false,
  );

  // The selection is missing, or is not an id.
  assert.equal(isDraftMessage({ type: "draft", content }), false);
  assert.equal(isDraftMessage({ type: "draft", content, selectedId: 3 }), false);

  // Not a draft at all.
  assert.equal(isDraftMessage({ type: "ready" }), false);
  assert.equal(isDraftMessage("draft"), false);
  assert.equal(isDraftMessage(null), false);
});

test("the preview's messages are accepted and anything else is refused", () => {
  assert.equal(isPreviewMessage({ type: "ready" }), true);
  assert.equal(isPreviewMessage({ type: "select", id: "intro" }), true);
  assert.equal(isPreviewMessage({ type: "visit", path: "/squad" }), true);

  assert.equal(isPreviewMessage({ type: "select" }), false);
  assert.equal(isPreviewMessage({ type: "select", id: 7 }), false);
  assert.equal(isPreviewMessage({ type: "visit" }), false);
  assert.equal(isPreviewMessage({ type: "visit", path: null }), false);
  assert.equal(isPreviewMessage({ type: "draft", content: [], selectedId: null }), false);
  assert.equal(isPreviewMessage(undefined), false);
});
