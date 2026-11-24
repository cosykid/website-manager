import assert from "node:assert/strict";
import { test } from "node:test";
import { pageFileName, readPageFile, writePageFile } from "./file";
import type { PageDocument } from "./types";

const squad: PageDocument = {
  schemaVersion: 1,
  siteId: "ironbarks",
  path: "/squad",
  title: "Squad",
  content: [
    {
      id: "wrapper",
      type: "section",
      props: { layout: "full", background: "none" },
      children: [{ id: "intro", type: "banner", props: { heading: "The squad" } }],
    },
  ],
};

test("a page written to a file reads back the same", () => {
  const result = readPageFile(writePageFile(squad));

  assert.deepEqual(result, {
    ok: true,
    page: { title: "Squad", path: "/squad", content: squad.content },
  });
});

test("a file needs no siteId or schemaVersion, and spaces round a title are dropped", () => {
  const text = JSON.stringify({ title: "  Join us ", path: "/join", content: [] });

  assert.deepEqual(readPageFile(text), {
    ok: true,
    page: { title: "Join us", path: "/join", content: [] },
  });
});

test("text that is not JSON is refused, with the parser's reason", () => {
  const result = readPageFile('{ "title": "Squad", }');

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.problems.length, 1);
  assert.match(result.ok === false ? result.problems[0] : "", /^The file is not valid JSON: /);
});

test("JSON that is not one page is refused", () => {
  for (const text of ["[]", '"squad"', "null", "7"]) {
    assert.deepEqual(readPageFile(text), {
      ok: false,
      problems: ['The file must hold one page: an object with "title", "path" and "content".'],
    });
  }
});

test("every problem with a page's details is reported at once", () => {
  const text = JSON.stringify({ schemaVersion: 2, title: " ", path: "Squad", content: [] });
  const result = readPageFile(text);

  assert.equal(result.ok, false);
  assert.deepEqual(result.ok === false && result.problems, [
    '"schemaVersion" is 2. This manager reads version 1.',
    "Title is required.",
    'Path must start with "/" and use lowercase letters, numbers and hyphens, such as /about-us. The home page is "/".',
  ]);
});

test("content that is not a tree of components is refused", () => {
  const twoWithOneId = [
    { id: "intro", type: "banner", props: {} },
    { id: "intro", type: "banner", props: {} },
  ];

  for (const content of [undefined, "banner", [{ type: "banner", props: {} }], twoWithOneId]) {
    const result = readPageFile(JSON.stringify({ title: "Squad", path: "/squad", content }));
    assert.equal(result.ok, false);
    assert.match(
      result.ok === false ? result.problems[0] : "",
      /^"content" must be a list of components\./,
    );
  }
});

test("a file is named after its site and path, as the seed files are", () => {
  assert.equal(pageFileName("ironbarks", "/"), "ironbarks.home.json");
  assert.equal(pageFileName("ironbarks", "/squad"), "ironbarks.squad.json");
  assert.equal(
    pageFileName("harbour-sevens", "/teams/under-18s"),
    "harbour-sevens.teams-under-18s.json",
  );
  // A path that is still being typed must not put odd characters in a file name.
  assert.equal(pageFileName("ironbarks", "/Our Team?"), "ironbarks.our-team.json");
});
