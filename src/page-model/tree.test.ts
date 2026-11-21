import assert from "node:assert/strict";
import { test } from "node:test";
import { isInstanceTree, isValidPath } from "./shape";
import {
  findInstance,
  insertInstance,
  moveInstance,
  removeInstance,
  updateProps,
} from "./tree";
import type { ComponentInstance } from "./types";

// A small page: two top-level items, the first a container with a nested
// container inside it.
function samplePage(): ComponentInstance[] {
  return [
    {
      id: "outer",
      type: "section",
      props: {},
      children: [
        { id: "grid", type: "card-grid", props: { title: "Squad" } },
        {
          id: "inner",
          type: "section",
          props: {},
          children: [{ id: "deep", type: "banner", props: {} }],
        },
      ],
    },
    { id: "last", type: "banner", props: {} },
  ];
}

const newInstance: ComponentInstance = { id: "new", type: "banner", props: {} };

function ids(nodes: ComponentInstance[]): string[] {
  return nodes.map((node) => node.id);
}

test("findInstance finds an instance nested two levels down", () => {
  assert.equal(findInstance(samplePage(), "deep")?.type, "banner");
  assert.equal(findInstance(samplePage(), "missing"), undefined);
});

test("insertInstance adds to the end of the page when there is no parent", () => {
  const result = insertInstance(samplePage(), null, newInstance);
  assert.deepEqual(ids(result), ["outer", "last", "new"]);
});

test("insertInstance adds inside a nested container", () => {
  const result = insertInstance(samplePage(), "inner", newInstance);
  const inner = findInstance(result, "inner");
  assert.deepEqual(ids(inner?.children ?? []), ["deep", "new"]);
});

test("removeInstance removes a nested instance and what it contains", () => {
  const result = removeInstance(samplePage(), "inner");
  assert.equal(findInstance(result, "inner"), undefined);
  assert.equal(findInstance(result, "deep"), undefined);
  assert.deepEqual(ids(findInstance(result, "outer")?.children ?? []), ["grid"]);
});

test("moveInstance swaps an instance with its neighbour", () => {
  const result = moveInstance(samplePage(), "inner", "up");
  assert.deepEqual(ids(findInstance(result, "outer")?.children ?? []), [
    "inner",
    "grid",
  ]);
});

test("moveInstance does nothing at the first and last positions", () => {
  assert.deepEqual(moveInstance(samplePage(), "outer", "up"), samplePage());
  assert.deepEqual(moveInstance(samplePage(), "last", "down"), samplePage());
});

test("updateProps replaces the props of one nested instance", () => {
  const result = updateProps(samplePage(), "grid", { title: "Coaches" });
  assert.deepEqual(findInstance(result, "grid")?.props, { title: "Coaches" });
  assert.deepEqual(findInstance(result, "deep")?.props, {});
});

test("edits leave the original tree untouched", () => {
  const original = samplePage();
  insertInstance(original, "inner", newInstance);
  removeInstance(original, "grid");
  moveInstance(original, "inner", "up");
  updateProps(original, "grid", { title: "Changed" });
  assert.deepEqual(original, samplePage());
});

test("isInstanceTree accepts a well-formed tree", () => {
  assert.equal(isInstanceTree(samplePage()), true);
  assert.equal(isInstanceTree([]), true);
});

test("isInstanceTree rejects malformed content", () => {
  assert.equal(isInstanceTree("not a list"), false);
  assert.equal(isInstanceTree([{ id: "a", type: "banner" }]), false);
  assert.equal(isInstanceTree([{ id: "", type: "banner", props: {} }]), false);
  assert.equal(
    isInstanceTree([{ id: "a", type: "banner", props: {}, children: "x" }]),
    false,
  );
});

test("isInstanceTree rejects two instances with the same id", () => {
  const duplicated = [
    { id: "a", type: "section", props: {}, children: [{ id: "a", type: "banner", props: {} }] },
  ];
  assert.equal(isInstanceTree(duplicated), false);
});

test("isValidPath accepts the home page and hyphenated paths", () => {
  for (const path of ["/", "/about", "/teams/under-18s", "/2026"]) {
    assert.equal(isValidPath(path), true, path);
  }
});

test("isValidPath rejects paths a site could not serve", () => {
  for (const path of ["", "about", "/About", "/a b", "/a/", "//a", "/a--b", "/a.png"]) {
    assert.equal(isValidPath(path), false, path);
  }
});
