# Page JSON guide

Every page is one JSON document. The manager writes that document for you.
This guide is for reading one, or for writing one by hand.

A file can be loaded in two ways: with **Import** in the manager, or with
`npm run seed`. Both check it against these rules before they load anything,
and say what is wrong and where.

- [A page](#a-page)
- [A component](#a-component)
- [Kinds of value](#kinds-of-value)
- [The components](#the-components): [`section`](#section),
  [`banner`](#banner), [`card-grid`](#card-grid)
- [A complete example](#a-complete-example)
- [Load a page](#load-a-page)
- [When a file is wrong](#when-a-file-is-wrong)
- [Mistakes nothing catches](#mistakes-nothing-catches)
- [On the live site](#on-the-live-site)
- [What page JSON cannot do](#what-page-json-cannot-do)

## A page

```json
{
  "schemaVersion": 1,
  "siteId": "ironbarks",
  "path": "/club",
  "title": "The club",
  "content": [
    {
      "id": "club-intro",
      "type": "section",
      "props": {},
      "children": [
        {
          "id": "club-intro-banner",
          "type": "banner",
          "props": { "heading": "About the club" }
        }
      ]
    }
  ]
}
```

That is a whole, valid page: a section that holds a banner.

| Field | Example | Rules |
| --- | --- | --- |
| `schemaVersion` | `1` | Always `1`. It is there so a later change to this format can be detected. The manager's import refuses any other number, and reads a file with no `schemaVersion` as version 1. |
| `siteId` | `"ironbarks"` | The `id` of a site in `seed/sites.json`. The demo has `ironbarks` and `harbour-sevens`. The seed needs it. The manager's import does not read it: the page goes to the site it is imported into. |
| `path` | `"/club"` | Where the page lives on its site. See the rules below. |
| `title` | `"The club"` | Required. Shown in the browser tab as "The club \| Ironbarks", and read out by screen readers as the page's main heading. It is not drawn on the page. |
| `content` | `[ … ]` | The page's components, from top to bottom. It may be empty. |

**Paths.** A path starts with `/` and is made of lowercase letters, numbers
and hyphens. The home page is `/`. A site has one page per path.

| Valid | Not valid |
| --- | --- |
| `/` | `/Teams` (capital letter) |
| `/teams` | `/teams/` (ends with a slash) |
| `/teams/under-18s` | `teams` (no slash at the start) |
| `/2027` | `/team_list`, `/our team` (underscore, space) |

**JSON itself.** Put double quotes around every key and every piece of text.
Put no comma after the last entry of a list or an object. Comments are not
allowed. Inside text, write `\"` for a double quote and `\n` for a line break.

## A component

Every entry in `content`, and in a section's `children`, has the same shape:

```json
{
  "id": "club-intro-banner",
  "type": "banner",
  "props": { "heading": "About the club" }
}
```

| Key | Rules |
| --- | --- |
| `id` | Any text, but not empty. No two components on a page may share an id, however deeply they are nested. Visitors never see it. Problems are reported by id, so a readable one such as `home-squad-grid` is easier to find. The manager generates random ids. |
| `type` | Which component this is: `"section"`, `"banner"` or `"card-grid"`. |
| `props` | The component's settings, as an object. It must be present even when it is empty: `"props": {}`. |
| `children` | Only on a `section`: the components inside it, in order. Leave this key off every other component. Even an empty `"children": []` is refused there. |

## Kinds of value

Every prop holds one of five kinds of value:

| Kind | Written as | Rules |
| --- | --- | --- |
| Text | `"Meet the squad"` | Plain text. HTML and Markdown are not interpreted, they show as typed. Required text cannot be empty or only spaces. |
| Address | `"/squad"` or `"https://example.com/tickets"` | A path on the same site that starts with a single `/`, or a full address that starts with `https://` or `http://`. Used for links and images. An image uploaded in the manager has one such as `/images/9f86d081884c7d659a2feaa0c55ad015.jpg`. |
| Choice | `"two-column"` | One of the listed values, spelled exactly. |
| Group | `{ "label": "Meet the squad", "href": "/squad" }` | Props that belong together. |
| List | `[ { … }, { … } ]` | Any number of entries, including none. |

**Leaving a prop out.** Only the props marked "Yes" under Required in the
tables below have to be written. A prop you leave out gets its empty value:
`""` for text, the default for a choice, `[]` for a list. An optional group
that is left out stays out, which is how a card has no link. If you do write
an optional group, fill in its required props. `null` counts as left out.

**Addresses that are refused.** `mailto:` and `tel:` links, an `#anchor` on
its own, an address that starts with `//`, and a bare `squad` with no slash
at the start.

## The components

Three types can be used in page JSON. Button, Heading and Image are not
among them. They are the building blocks these three are made of
(`src/library/primitives`), not components you can place on a page.

### `section`

Groups other components and sets their layout and background. It is the only
component that has `children`.

| Prop | Kind | Required | Values |
| --- | --- | --- | --- |
| `layout` | Choice | No | `"full"` (the default): the children stack, each one the full width. `"two-column"`: the children fill two equal columns from left to right, then start a new row. On a narrow screen the columns stack. |
| `background` | Choice | No | `"none"` (the default): the page's own background. `"light"`: the site's subtle tint. `"brand"`: the site's brand colour, with text and buttons recoloured so they stay readable. |

```json
{
  "id": "club-details",
  "type": "section",
  "props": { "layout": "two-column", "background": "light" },
  "children": []
}
```

- Put every banner and card grid inside a section. The section supplies the
  side margins and the space above and below. A component placed straight
  into `content` runs to the edges of the window.
- A section can hold sections. A nested section that has a background is
  drawn as a panel with the site's corner shape.
- The colours come from the site's theme in `seed/sites.json`, so `"brand"`
  is gold on Ironbarks and blue on Harbour Sevens.

### `banner`

A large heading and a short message, with an optional button and an optional
image.

| Prop | Kind | Required | Notes |
| --- | --- | --- | --- |
| `heading` | Text | Yes | The large heading. |
| `message` | Text | No | One or two sentences under the heading. Line breaks (`\n`) are kept. |
| `button` | Group | No | A solid button under the message. Leave it out for no button. |
| `button.label` | Text | Yes, if there is a button | The text on the button. |
| `button.href` | Address | Yes, if there is a button | Where the button goes. |
| `image` | Group | No | A picture beside the words, or under them where there is not room. Leave it out for no picture. |
| `image.url` | Address | Yes, if there is an image | The picture is cropped to fill a 4:3 frame, as a card's is. |
| `image.alt` | Text | No | Describes the picture for people who cannot see it. Leave it out when the picture is only decoration. |

```json
{
  "id": "club-training",
  "type": "banner",
  "props": {
    "heading": "Train with us",
    "message": "Open sessions run on Tuesday and Thursday evenings.\nAll levels welcome.",
    "button": { "label": "Meet the squad", "href": "/squad" }
  }
}
```

### `card-grid`

A title above a grid of cards. Each card has an image, a heading and an
optional link.

| Prop | Kind | Required | Notes |
| --- | --- | --- | --- |
| `title` | Text | Yes | The heading above the grid. |
| `cards` | List | No | The cards, in order. With no cards, only the title shows. |

Each entry in `cards`:

| Prop | Kind | Required | Notes |
| --- | --- | --- | --- |
| `heading` | Text | Yes | The card's heading, such as a name. |
| `image` | Group | Yes | The picture at the top of the card. |
| `image.url` | Address | Yes | The picture is cropped to fill a 4:3 frame, so the edges of a tall or wide one are cut off. |
| `image.alt` | Text | No | Describes the picture for people who cannot see it. Leave it out when the picture is only decoration. |
| `link` | Group | No | An outlined button at the bottom of the card. Leave it out for no button. |
| `link.label` | Text | Yes, if there is a link | The text on the button. |
| `link.href` | Address | Yes, if there is a link | Where the button goes. |

```json
{
  "id": "club-committee",
  "type": "card-grid",
  "props": {
    "title": "Committee",
    "cards": [
      {
        "heading": "Tessa Whitlock",
        "image": { "url": "/seed/ironbarks/jersey-1.svg", "alt": "Jersey number 1" },
        "link": { "label": "View the squad", "href": "/squad" }
      },
      {
        "heading": "Aroha Bennett",
        "image": { "url": "/seed/ironbarks/jersey-2.svg" }
      }
    ]
  }
}
```

- The grid fits as many cards in a row as there is room for. Inside a
  two-column section that is fewer cards per row.
- Cards have no `id`. A card is an entry in a prop, not a component.
- A file in the project's `public` folder is addressed from the site's root:
  `public/seed/ironbarks/jersey-1.svg` is `/seed/ironbarks/jersey-1.svg`.
  A full `https://` address on another host also works.
- To use a picture from your own computer, upload it in the manager: choose
  **Upload image** on any card or banner and copy the address it is given. The address
  works on every site.

## A complete example

All three components, a section inside a section, and several optional props
left out.

```json
{
  "schemaVersion": 1,
  "siteId": "ironbarks",
  "path": "/join",
  "title": "Join the club",
  "content": [
    {
      "id": "join-top",
      "type": "section",
      "props": { "background": "brand" },
      "children": [
        {
          "id": "join-top-banner",
          "type": "banner",
          "props": {
            "heading": "Pull on the jersey",
            "message": "New players are welcome all season.\nNo experience needed.",
            "button": { "label": "Meet the squad", "href": "/squad" }
          }
        }
      ]
    },
    {
      "id": "join-details",
      "type": "section",
      "props": { "layout": "two-column" },
      "children": [
        {
          "id": "join-training",
          "type": "banner",
          "props": {
            "heading": "Training",
            "message": "Tuesday and Thursday evenings. Bring boots and a mouthguard."
          }
        },
        {
          "id": "join-people",
          "type": "section",
          "props": { "background": "light" },
          "children": [
            {
              "id": "join-people-grid",
              "type": "card-grid",
              "props": {
                "title": "Who to look for",
                "cards": [
                  {
                    "heading": "Tessa Whitlock",
                    "image": { "url": "/seed/ironbarks/jersey-1.svg", "alt": "Jersey number 1" },
                    "link": { "label": "View the squad", "href": "/squad" }
                  },
                  {
                    "heading": "Aroha Bennett",
                    "image": { "url": "/seed/ironbarks/jersey-2.svg" }
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

From the top:

1. A section in the brand colour, holding a banner with a two-line message
   and a button.
2. A two-column section. The left column is a banner with no button.
3. The right column is a nested section with the subtle background, drawn as
   a panel. It holds a card grid. The second card has no link and no alt
   text.

## Load a page

There are two ways to load a file: import it in the manager, or seed it.

### Import it in the manager

1. Open the site in the manager, at http://localhost:3000.
2. Under **Import a page**, choose the file.

The page is created and opens in the editor. It is live straight away, as a
page created in the manager is.

- **The page goes to the site you are on.** `siteId` in the file is not read,
  so one file can be imported into any site.
- **The whole file has to be right.** If anything is wrong, no page is made
  and every problem is listed.
- **It only adds a page.** If the site already has a page at that path, the
  file is refused. To put the file's components on that page, open the page,
  choose **JSON**, then **Import**. The page keeps its title and path,
  nothing is saved until **Save page**, and **Undo** brings the old
  components back. Here a file is taken as long as its structure is right.
  Props that do not suit their component are marked in the editor, and the
  page cannot be saved until they are fixed.
- **It fills in what you left out**, as the seed does (see below).
- **It does not add the page to the site's menu.** That is part of the site,
  in `seed/sites.json`.

To get a page out as a file, open it in the manager and choose **JSON**,
then **Export**. The file is in this format and is named like the demo files,
for example `ironbarks.squad.json`. It holds the page as it is in the editor,
with any changes that have not been saved yet.

### Seed it

1. Save the file in `seed/pages/`. Any name that ends in `.json` works. The
   demo files are named `<site>.<page>.json`.
2. Run `npm run seed`.
3. Open the page on its site, for example
   http://ironbarks.localhost:3000/join. It is also listed in the manager,
   where it can be edited like any other page.

What the seed does:

- **It checks every file first.** If one has a problem, nothing is loaded.
- **It only adds pages.** A page whose site and path are already in the
  database is left alone, so a seed never overwrites an editor's work. It
  also means that changing the file of a page that is already loaded does
  nothing. To load it again, run `npm run seed -- --reset`. That deletes
  every site, page and uploaded image first, including pages made or changed in
  the manager.
- **It fills in what you left out.** Each missing prop is stored with its
  empty value, and a prop the component does not have is dropped. The manager
  saves pages the same way.
- **It does not add the page to the site's menu.** Add a link to the site's
  `navigation` in `seed/sites.json` and run `npm run seed` again. Sites are
  rewritten on every run.
- **It has stored pages rendered again.** In production, rendered pages are
  kept in Redis. A seed puts all of them out of date, so no visitor is shown
  an old one.

## When a file is wrong

`npm run seed` stops and lists every problem it found:

```text
The seed data has problems:
  Page ironbarks/Club: invalid path
  Page ironbarks/Club, "club-top" layout: Choose one of the layout options.
  Page ironbarks/Club, "club-banner" heading: Heading is required.
  Page ironbarks/Club, "club-grid" cards.0.image.url: Image address is required.
```

Each line names the page by its site and path, then the component's `id` in
quotes, then the prop. Dots lead into groups and lists, and lists count from
0, so `cards.0.image.url` is the address of the first card's image.

| Message | Cause |
| --- | --- |
| `seed/pages/… is not valid JSON: …` | A slip in the JSON itself. The message gives the file, the line and the column. It is usually a missing or extra comma, or a missing quote. |
| `unknown site` | `siteId` is not the `id` of a site in `seed/sites.json`. |
| `invalid path` | `path` breaks the rules under [A page](#a-page). |
| `title is missing` | `title` is absent, empty, or not text. |
| `content is not a valid tree of components` | The structure is wrong somewhere. `content` or a `children` is not a list, a component has no `id`, `type` or `props`, or two components share an `id`. |
| `"hero" is not a component in the library.` | `type` is not `section`, `banner` or `card-grid`. |
| `Banner cannot contain other components.` | `children` on a component that is not a section. |
| `Heading is required.` | A required text or address is absent or blank. A misspelt name for a required prop also ends up here. |
| `Heading must be text.` | A number, `true`, a list or an object where text belongs. |
| `Button address must start with / or https://.` | An address that is neither a path on the site nor a full web address. |
| `Choose one of the layout options.` | A choice that is not one of the listed values. |
| `Cards must be a list.` | Something other than `[ … ]` where a list belongs. |
| `Image is not in the expected shape.` | Something other than `{ … }` where a group belongs, such as `"image": "/photo.svg"`. |

The manager reports the same problems, in the same words, when a page is
saved there.

The manager's import lists them too. It leaves out the page's name, because
there is only one file:

```text
club.json was not imported.
  "club-top" layout: Choose one of the layout options.
  "club-banner" heading: Heading is required.
```

It words the problems with the file itself differently, and has three of its
own:

| Message | Cause |
| --- | --- |
| `The file is not valid JSON: …` | A slip in the JSON itself, as in the first row above. The message gives the line and the column. |
| `The file must hold one page: an object with "title", "path" and "content".` | The file is JSON but not a page: a list, a number or a piece of text. |
| `Title is required.` | `title` is absent, empty, or not text. |
| `Path must start with "/" and use lowercase letters, …` | `path` is absent or breaks the rules under [A page](#a-page). |
| `"content" must be a list of components. …` | The structure is wrong somewhere, as for `content is not a valid tree of components` above. |
| `"schemaVersion" is 2. This manager reads version 1.` | The file says it is in a later version of this format. |
| `Ironbarks already has a page at "/club". …` | Import only adds pages. Change `path` in the file, or import the file into that page from its editor. |
| `The file is larger than 500 KB, …` | A page file is a few kilobytes. This is some other file. |

## Mistakes nothing catches

- **A misspelt name for an optional prop.** A banner has no prop called
  `"mesage"`, so it is dropped and the banner has no message. A prop the
  component does not have is never an error.
- **An address that leads nowhere.** Nothing checks that an image exists or
  that a link's page does. A wrong image address shows as a broken image. The
  form in the manager says when there is no picture at an address, but the
  page can be saved.
- **An uploaded picture that was left behind.** A page file holds a picture's
  address and not the picture itself. Imported into a manager with another
  database, the page has broken images until they are uploaded there.
- **Two files with the same site and path.** Only one of them is loaded.
- **No alt text** on a picture that carries meaning.

## On the live site

The public site runs the same checks again each time it draws a page. A
component that fails is left out, together with anything inside it, and the
rest of the page is drawn. The server's log names the component:

```text
Skipped "club-banner" (banner): Heading is required.
```

The seed and the manager both refuse to store such a page. So this only
happens when a component's definition changes after pages were saved, for
example when it gains a required prop, or when a page is put into MongoDB
some other way. (In production, a page changed that way can take up to an
hour to show. The README's "Pre-rendering" says why.)

## What page JSON cannot do

- **Only these three components.** There is no paragraph, image, heading or
  button to place on its own. A new kind of content means a new component in
  `src/library`. The README's "Add a new component" shows how.
- **Only a section holds other components.** A banner cannot go inside a
  card, for example.
- **No styling.** No colours, fonts, sizes, spacing, class names or HTML.
  How a page looks comes from its site's theme, which is why one page format
  serves every site.
- **Plain text only.** No bold, no link inside a sentence, no list inside a
  message.
- **Fixed heading levels.** The page title is the `h1`. Banner headings and
  card grid titles are `h2`. Card headings are `h3`.
- **Links go to pages.** There are no `mailto:`, `tel:` or `#anchor`
  addresses.
- **Images are addresses.** A page file has no pictures in it, only where to
  find them. They are always cropped to 4:3.
- **Content is fixed.** A page cannot pull in data, such as fixtures from
  another system, or reuse a block from another page.
- **A page has a title and a path, and nothing more.** No description for
  search engines, no draft and no publish date.
- **A page belongs to one site.**
