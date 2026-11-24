import assert from "node:assert/strict";
import { test } from "node:test";
import { pageTree, type PageNode } from "./page-tree";

/** The tree as nested paths, which is easier to read in a test. */
type Paths = (string | [string, Paths])[];

function toPaths(nodes: PageNode<{ path: string }>[]): Paths {
  return nodes.map(({ page, children }) =>
    children.length > 0 ? [page.path, toPaths(children)] : page.path,
  );
}

function treeOf(...paths: string[]): Paths {
  return toPaths(pageTree(paths.map((path) => ({ path }))));
}

test("pages go under the page their path starts with, whatever order they come in", () => {
  assert.deepEqual(
    treeOf("/squad/juniors/girls", "/squad", "/", "/news", "/squad/juniors"),
    ["/", "/news", ["/squad", [["/squad/juniors", ["/squad/juniors/girls"]]]]],
  );
});

test("the home page comes first and has no pages under it", () => {
  assert.deepEqual(treeOf("/about", "/"), ["/", "/about"]);
});

test("a page whose parent does not exist goes under the closest page that does", () => {
  assert.deepEqual(treeOf("/news/2026/launch", "/news"), [
    ["/news", ["/news/2026/launch"]],
  ]);
  assert.deepEqual(treeOf("/news/2026/launch"), ["/news/2026/launch"]);
});

test("a path that only starts with the same letters is not a parent", () => {
  assert.deepEqual(treeOf("/squad", "/squad-2", "/squad/juniors"), [
    ["/squad", ["/squad/juniors"]],
    "/squad-2",
  ]);
});

test("a site with no pages has an empty tree", () => {
  assert.deepEqual(treeOf(), []);
});
