import assert from "node:assert/strict";
import { test } from "node:test";
import seededSites from "../../seed/sites.json";
import { contrastRatio, findContrastProblems } from "./contrast";
import type { Site } from "./types";

const sites = seededSites as Site[];

test("contrastRatio matches the known extremes", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(contrastRatio("#336699", "#336699"), 1);
});

test("contrastRatio does not depend on the order of the colours", () => {
  assert.equal(
    contrastRatio("#0B5CAD", "#FFFFFF"),
    contrastRatio("#FFFFFF", "#0B5CAD"),
  );
});

test("every seeded theme keeps its text readable", () => {
  for (const site of sites) {
    assert.deepEqual(findContrastProblems(site.theme), [], site.name);
  }
});

test("a faint theme is reported with the pairing and its ratio", () => {
  const faint = structuredClone(sites[1].theme);
  faint.colors.textMuted = "#B8C4D0";

  const problems = findContrastProblems(faint);
  assert.equal(problems.length, 2);
  assert.match(problems[0], /^textMuted on surface is 1\.\d\d:1/);
});
