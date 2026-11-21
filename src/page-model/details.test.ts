import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPageDetails, suggestPath } from "./details";
import { isValidPath } from "./shape";

test("a title with a valid path has no problems", () => {
  assert.deepEqual(checkPageDetails("Home", "/"), {});
  assert.deepEqual(checkPageDetails("About us", "/about-us"), {});
  assert.deepEqual(checkPageDetails("Under 18s", "/teams/under-18s"), {});
});

test("a blank title is a problem", () => {
  assert.equal(checkPageDetails("   ", "/about").title, "Title is required.");
});

test("a path that is not lowercase words after a slash is a problem", () => {
  const refused = ["", "about", "/About", "/about us", "/about/", "//about", "/about_us"];

  for (const path of refused) {
    assert.ok(checkPageDetails("About", path).path, `"${path}" should be refused`);
  }
});

test("a suggested path is the title in lowercase, joined by hyphens", () => {
  assert.equal(suggestPath("Meet the Team!"), "/meet-the-team");
  assert.equal(suggestPath("Fixtures & Results"), "/fixtures-results");
  assert.equal(suggestPath("  2026 Season  "), "/2026-season");
});

test("a suggested path is always one the manager accepts", () => {
  for (const title of ["Meet the Team!", "Fixtures & Results", "!!!", "Ünder 18s"]) {
    assert.ok(isValidPath(suggestPath(title)), `path for "${title}"`);
  }
});
