import assert from "node:assert/strict";
import { test } from "node:test";
import { isInstanceTree, isValidPath } from "./shape";
import {
  findAncestors,
  findInstance,
  findPlace,
  insertInstance,
  moveInstance,
  moveInstanceTo,
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

test("insertInstance adds in front of a neighbour, on the page and inside a container", () => {
  const onPage = insertInstance(samplePage(), null, newInstance, "last");
  assert.deepEqual(ids(onPage), ["outer", "new", "last"]);

  const inside = insertInstance(samplePage(), "outer", newInstance, "grid");
  assert.deepEqual(ids(findInstance(inside, "outer")?.children ?? []), [
    "new",
    "grid",
    "inner",
  ]);
});

test("findAncestors lists what an instance is inside, outermost first", () => {
  assert.deepEqual(ids(findAncestors(samplePage(), "deep")), ["outer", "inner"]);
  assert.deepEqual(findAncestors(samplePage(), "outer"), []);
  assert.deepEqual(findAncestors(samplePage(), "missing"), []);
});

test("findPlace says where an instance is", () => {
  const page = samplePage();
  assert.deepEqual(findPlace(page, "outer"), { parentId: null, beforeId: "last" });
  assert.deepEqual(findPlace(page, "last"), { parentId: null, beforeId: null });
  assert.deepEqual(findPlace(page, "grid"), { parentId: "outer", beforeId: "inner" });
  assert.deepEqual(findPlace(page, "deep"), { parentId: "inner", beforeId: null });
  assert.equal(findPlace(page, "missing"), undefined);
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

test("moveInstanceTo re-orders within a container, both ways", () => {
  const down = moveInstanceTo(samplePage(), "grid", { parentId: "outer", beforeId: null });
  assert.deepEqual(ids(findInstance(down, "outer")?.children ?? []), ["inner", "grid"]);

  const up = moveInstanceTo(samplePage(), "last", { parentId: null, beforeId: "outer" });
  assert.deepEqual(ids(up), ["last", "outer"]);
});

test("moveInstanceTo moves into a container, and takes along what is inside", () => {
  const into = moveInstanceTo(samplePage(), "last", { parentId: "inner", beforeId: "deep" });
  assert.deepEqual(ids(into), ["outer"]);
  assert.deepEqual(ids(findInstance(into, "inner")?.children ?? []), ["last", "deep"]);

  const outOf = moveInstanceTo(samplePage(), "inner", { parentId: null, beforeId: null });
  assert.deepEqual(ids(outOf), ["outer", "last", "inner"]);
  assert.deepEqual(ids(findInstance(outOf, "outer")?.children ?? []), ["grid"]);
  assert.deepEqual(ids(findInstance(outOf, "inner")?.children ?? []), ["deep"]);
});

test("moveInstanceTo leaves the tree alone when the instance is already there", () => {
  const page = samplePage();
  // The gap in front of it, and the gap behind it.
  assert.equal(moveInstanceTo(page, "grid", { parentId: "outer", beforeId: "grid" }), page);
  assert.equal(moveInstanceTo(page, "grid", { parentId: "outer", beforeId: "inner" }), page);
  assert.equal(moveInstanceTo(page, "last", { parentId: null, beforeId: null }), page);
});

test("moveInstanceTo never puts an instance inside itself, or somewhere that does not exist", () => {
  const page = samplePage();
  assert.equal(moveInstanceTo(page, "outer", { parentId: "outer", beforeId: null }), page);
  assert.equal(moveInstanceTo(page, "outer", { parentId: "inner", beforeId: "deep" }), page);
  assert.equal(moveInstanceTo(page, "last", { parentId: "missing", beforeId: null }), page);
  assert.equal(moveInstanceTo(page, "missing", { parentId: null, beforeId: null }), page);
});

test("moveInstanceTo loses nothing and copies nothing, whatever is moved where", () => {
  const everyId = ["outer", "grid", "inner", "deep", "last"];
  const allIds = (nodes: ComponentInstance[]): string[] =>
    nodes.flatMap((node) => [node.id, ...allIds(node.children ?? [])]);

  for (const id of everyId) {
    for (const parentId of [null, ...everyId]) {
      for (const beforeId of [null, ...everyId]) {
        const result = moveInstanceTo(samplePage(), id, { parentId, beforeId });
        assert.deepEqual(
          allIds(result).sort(),
          [...everyId].sort(),
          `${id} to ${parentId}, before ${beforeId}`,
        );
      }
    }
  }
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
  moveInstanceTo(original, "deep", { parentId: null, beforeId: "outer" });
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
