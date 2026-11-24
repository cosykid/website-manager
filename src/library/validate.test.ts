import assert from "node:assert/strict";
import { test } from "node:test";
import type { ComponentInstance } from "@/page-model/types";
import { definitions } from "./definitions";
import type { Field } from "./types";
import {
  describeIssues,
  emptyValue,
  fillGroup,
  fillTree,
  isSafeAddress,
  validateGroup,
  validateTree,
} from "./validate";

const cardGridFields = definitions["card-grid"].fields;

function validCard() {
  return {
    heading: "Mia Thompson",
    image: { url: "/seed/player.svg", alt: "Mia Thompson" },
    link: { label: "View profile", href: "/squad" },
  };
}

function paths(issues: { path: string }[]): string[] {
  return issues.map((issue) => issue.path);
}

test("a complete card grid has no problems", () => {
  const issues = validateGroup(cardGridFields, {
    title: "Meet the team",
    cards: [validCard()],
  });
  assert.deepEqual(issues, []);
});

test("a required text field cannot be empty or only spaces", () => {
  const issues = validateGroup(cardGridFields, { title: "   ", cards: [] });
  assert.deepEqual(issues, [{ path: "title", message: "Title is required." }]);
});

test("problems inside a list say which entry and which field", () => {
  const second = { ...validCard(), heading: "" };
  const third = { ...validCard(), image: { url: "", alt: "" } };
  const issues = validateGroup(cardGridFields, {
    title: "Meet the team",
    cards: [validCard(), second, third],
  });
  assert.deepEqual(paths(issues), ["cards.1.heading", "cards.2.image.url"]);
});

test("an optional group can be left out but must be complete when present", () => {
  const withoutLink = { heading: "Mia", image: { url: "/a.svg", alt: "" } };
  const halfLink = { ...withoutLink, link: { label: "Profile", href: "" } };

  assert.deepEqual(
    validateGroup(cardGridFields, { title: "Team", cards: [withoutLink] }),
    [],
  );
  assert.deepEqual(
    paths(validateGroup(cardGridFields, { title: "Team", cards: [halfLink] })),
    ["cards.0.link.href"],
  );
});

test("a select must hold one of its options", () => {
  const fields = definitions["section"].fields;
  assert.deepEqual(validateGroup(fields, { layout: "full", background: "brand" }), []);
  assert.deepEqual(
    paths(validateGroup(fields, { layout: "three-column", background: "brand" })),
    ["layout"],
  );
});

test("values of the wrong kind are reported, not thrown", () => {
  const issues = validateGroup(cardGridFields, { title: 42, cards: "none" });
  assert.deepEqual(paths(issues), ["title", "cards"]);
});

test("addresses must be a path on the site or an http(s) address", () => {
  for (const address of ["/", "/about", "/seed/a.svg", "https://example.com/a", "http://example.com"]) {
    assert.equal(isSafeAddress(address), true, address);
  }
  for (const address of ["javascript:alert(1)", "//evil.example", "about", "mailto:a@b.c", "data:text/html,x", "https://"]) {
    assert.equal(isSafeAddress(address), false, address);
  }
});

test("emptyValue gives each kind of field a starting value", () => {
  const select: Field = {
    kind: "select",
    label: "Layout",
    default: "full",
    options: [{ value: "full", label: "Full width" }],
  };
  assert.equal(emptyValue({ kind: "text", label: "Title" }), "");
  assert.equal(emptyValue(select), "full");
  assert.deepEqual(emptyValue({ kind: "list", label: "Cards", itemLabel: "card", item: select }), []);
});

test("fillGroup gives a new component every prop it needs", () => {
  assert.deepEqual(fillGroup(definitions["section"].fields, {}), {
    layout: "full",
    background: "none",
  });
  assert.deepEqual(fillGroup(cardGridFields, {}), { title: "", cards: [] });
});

test("fillGroup fills gaps in saved props and drops props that no longer exist", () => {
  const saved = {
    title: "Team",
    removedLongAgo: true,
    cards: [{ heading: "Mia", image: { url: "/a.svg" } }],
  };
  assert.deepEqual(fillGroup(cardGridFields, saved), {
    title: "Team",
    cards: [{ heading: "Mia", image: { url: "/a.svg", alt: "" } }],
  });
});

test("a page that leaves optional props out is valid once it is filled", () => {
  const handWritten: ComponentInstance[] = [
    {
      id: "wrapper",
      type: "section",
      props: {},
      children: [
        { id: "intro", type: "banner", props: { heading: "Welcome" } },
        {
          id: "grid",
          type: "card-grid",
          props: { title: "Team", cards: [{ heading: "Mia", image: { url: "/a.svg" } }] },
        },
      ],
    },
  ];

  const filled = fillTree(handWritten, definitions);

  assert.deepEqual(validateTree(filled, definitions), {});
  assert.deepEqual(filled[0].props, { layout: "full", background: "none" });
  assert.deepEqual(filled[0].children?.[0].props, { heading: "Welcome", message: "" });
});

test("filling does not hide a missing required prop", () => {
  const page: ComponentInstance[] = [{ id: "intro", type: "banner", props: {} }];
  const issues = validateTree(fillTree(page, definitions), definitions);
  assert.equal(issues["intro"][0].message, "Heading is required.");
});

test("validateTree reports problems by instance, including nested ones", () => {
  const page: ComponentInstance[] = [
    {
      id: "outer",
      type: "section",
      props: { layout: "full", background: "none" },
      children: [
        { id: "grid", type: "card-grid", props: { title: "", cards: [] } },
      ],
    },
  ];
  assert.deepEqual(Object.keys(validateTree(page, definitions)), ["grid"]);
});

test("validateTree flags unknown components and misplaced children", () => {
  const page: ComponentInstance[] = [
    { id: "mystery", type: "carousel", props: {} },
    {
      id: "grid",
      type: "card-grid",
      props: { title: "Team", cards: [] },
      children: [],
    },
  ];
  const issues = validateTree(page, definitions);
  assert.match(issues["mystery"][0].message, /not a component in the library/);
  assert.match(issues["grid"][0].message, /cannot contain other components/);
});

test("describeIssues names the component, and the prop when there is one", () => {
  const page: ComponentInstance[] = [
    { id: "mystery", type: "carousel", props: {} },
    { id: "intro", type: "banner", props: { heading: "", message: "" } },
  ];

  assert.deepEqual(describeIssues(validateTree(page, definitions)), [
    '"mystery": "carousel" is not a component in the library.',
    '"intro" heading: Heading is required.',
  ]);
});
