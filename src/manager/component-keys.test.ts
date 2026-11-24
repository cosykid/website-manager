import assert from "node:assert/strict";
import { test } from "node:test";
import { keyRequest } from "./component-keys";

const plain = { altKey: false, ctrlKey: false, metaKey: false };

test("keyRequest knows the keys that act on a component", () => {
  assert.equal(keyRequest({ ...plain, key: "F2" }), "rename");
  assert.equal(keyRequest({ ...plain, key: "Delete" }), "remove");
  assert.equal(keyRequest({ ...plain, key: "Backspace" }), "remove");
  assert.equal(keyRequest({ ...plain, key: "d", metaKey: true }), "duplicate");
  assert.equal(keyRequest({ ...plain, key: "D", ctrlKey: true }), "duplicate");
  assert.equal(keyRequest({ ...plain, key: "ArrowUp", altKey: true }), "up");
  assert.equal(keyRequest({ ...plain, key: "ArrowDown", altKey: true }), "down");
});

test("keyRequest leaves typing and plain arrow keys alone", () => {
  assert.equal(keyRequest({ ...plain, key: "d" }), null);
  assert.equal(keyRequest({ ...plain, key: "ArrowUp" }), null);
  assert.equal(keyRequest({ ...plain, key: "Enter" }), null);
});
