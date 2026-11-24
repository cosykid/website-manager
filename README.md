# Website manager

A small platform for running many websites from one shared component library.
Editors compose pages in a manager. Each page is saved as a JSON tree of
components in MongoDB, and the public sites render that JSON on the server.
In production each page is rendered before anyone visits it and kept in Redis.
Two demo sites, Ironbarks and Harbour Sevens, use the same components with
different themes.

Built with Next.js 16 (App Router), TypeScript, and the official MongoDB and
Redis clients. No CMS or page-builder library is used: the component
definitions, the generated forms, the validator and the renderer are all in
this repo.

## Run it

You need Node 22.18 or newer and Docker.

```bash
npm install
npm run setup   # starts MongoDB and Redis in Docker, then seeds two sites and four pages
npm run dev
```

Then open:

| What | Address |
| --- | --- |
| Manager | http://localhost:3000 |
| Ironbarks (dark green and gold) | http://ironbarks.localhost:3000 |
| Harbour Sevens (white, blue and raspberry) | http://harbour-sevens.localhost:3000 |

Names ending in `.localhost` point at your own machine in Chrome, Edge,
Firefox, and in Safari on macOS. If one does not load, add
`127.0.0.1 ironbarks.localhost harbour-sevens.localhost` to `/etc/hosts`.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run seed` | Writes both demo sites from `seed/sites.json` and adds any missing page. Never overwrites a page you have edited. |
| `npm run seed -- --reset` | Deletes every site, page and uploaded image, then seeds again. |
| `npm test` | Runs the unit tests (Node's built-in test runner). |
| `npm run typecheck` / `npm run lint` | TypeScript and ESLint. |
| `npm run build` then `npm start` | Production build. This is where pages are pre-rendered: `npm run dev` renders a page each time it is asked for. |
| `npm run db:down` | Stops MongoDB and Redis. MongoDB's data is kept in a Docker volume. |

### Environment variables

Nothing needs to be set for the steps above: the defaults match
`docker-compose.yml`. To change one, copy `.env.example` to `.env.local`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27018` | Where MongoDB is. For Atlas, paste the connection string here and start only Redis, with `docker compose up -d --wait redis`. |
| `MONGODB_DB` | `website_manager` | Database name. |
| `REDIS_URL` | `redis://127.0.0.1:6380` | Where rendered public pages are kept. Without Redis the sites still work, and render each page every time it is asked for. |
| `MANAGER_HOSTS` | `localhost,127.0.0.1` | Hostnames that show the manager. Any other hostname is treated as a public site. |

MongoDB listens on 27018 and Redis on 6380, not the usual 27017 and 6379, so
they do not clash with ones you may already have running.

### Things to try

1. In the manager, open **Ironbarks**, then **Home**. On the left are the
   site's pages and, under them, everything on this page as a tree. Beside
   them is a live preview: the page as visitors will see it.
2. Click the big heading in the preview. Its form opens. Change the heading
   and the preview follows as you type. Nothing is public until **Save page**;
   **View page** opens the live page in a new tab.
3. Choose the card grid in the tree, and add a card. Choose **Upload image**
   and pick any photo. It is made smaller, uploaded and shown in the preview.
4. Drag a row of the tree above or below another, into a Section or out of
   one. The rest move apart to make room, the Section it would go into is
   ringed in blue, and the preview shows the page as it would be. Let go to
   drop it, or press Esc to call it off. On a touch screen, drag it by its six
   dots. Then choose **Undo**. The arrows and **Placed in** on a component's
   form make the same moves without dragging.
5. Choose **Add inside Section** to nest a component, or **Add component** to
   add one at the top level.
6. Double-click a Section's row, or press F2, and give it a name such as
   "Hero", so it can be told from the other Sections. The row's three dots,
   or a right click, open a menu with the rest: duplicate, move up or down,
   and remove, each beside the key that does the same. The page's title is
   renamed the same way, from its own row.
7. Change something, then open another page from the list, or by clicking the
   site's own menu in the preview. The first page is marked **Unsaved** and
   keeps its changes until you come back to it.
8. Switch the preview to **Phone** to see the page at a phone's width.
9. Save with a required field empty to see where problems are reported.
10. Create a page on Harbour Sevens. The same components appear in that
    site's colours, type and corner shapes. Give it a path under another
    page's, such as `/teams/juniors`, and it is listed under that page.
11. Carry a page from one site to the other. Open Ironbarks' **Squad**, choose
    **JSON**, then **Export**. On Harbour Sevens, choose that file under
    **Import a page**. The page is there, in the other site's theme.
12. Visit a path that does not exist, such as
    http://ironbarks.localhost:3000/nope. It answers with HTTP 404, as does a
    path that exists only on the other site.
13. See the pre-rendering. Stop the dev server, run `npm run build` then
    `npm start`, and run the command below. It says `HIT` although nobody has
    visited the page: the server rendered it when it started. Save that page in
    the manager and refresh it. The edit is there, and it is still a `HIT`.

    ```bash
    curl -sI http://ironbarks.localhost:3000/squad | grep x-nextjs-cache
    ```

## How it fits together

```text
                      definitions (data)          components (React)
                      src/library/*/definition    src/library/*/*.tsx
                               |                          |
        +----------------------+-------+                  |
        |                              |                  |
  MANAGER  src/manager           validate.ts         RENDERER  src/renderer
  draws a form from each         one validator       turns the page tree
  definition, edits the tree     used by both        into React elements
        |                              |                  |
        +----------- page JSON in MongoDB (pages) --------+
```

| Folder | What is in it |
| --- | --- |
| `src/page-model` | The page JSON: its types, pure functions that edit the tree, shape checks, and reading and writing a page as a file. Also how a site's pages nest, and the messages the editor and its preview exchange. No React, no database. |
| `src/library` | The shared components. Each has a definition (data) and a React component. `primitives/` holds Button, Heading and Image. `validate.ts` checks values against definitions. |
| `src/images` | Uploaded images: which files are taken, and the address each one gets. |
| `src/site` | The Site and Theme types, theme to CSS variables, and the contrast check. |
| `src/db` | The MongoDB connection and every query. |
| `src/cache` | The rendered public pages: the Redis connection, the cache Next.js keeps them in, and the pre-rendering. |
| `src/renderer` | `RenderTree`, the site header and footer, and the styles shared by all sites. `preview/` is the page the editor shows in its preview frame. |
| `src/manager` | The manager's screens: page editor, page list, outline, dragging, generated forms, preview pane, component picker, JSON import and export, server actions. |
| `src/app/(manager)` | Manager routes. |
| `src/app/(sites)` | The one public route, the route that serves uploaded images, and the preview route the editor frames. |
| `src/proxy.ts` | Sends each hostname to the manager or to a site. |
| `src/instrumentation.ts` | Runs when a server starts, and has the public pages pre-rendered. |
| `seed/`, `scripts/seed.ts` | The two demo sites and their pages as JSON, and the script that checks and loads them. |
| `docs/page-json.md` | A guide to writing page JSON by hand. |

One rule keeps the two halves apart: **the manager never imports a React
component from the library, and nothing outside `src/manager` imports from
it.** The manager only reads definitions, which are plain data. The public
route imports only `renderer`, `library`, `site`, `db` and `page-model`, and
the image route only `db` and `images`. That is what "renderable without the
manager" means here: the manager's code could be deleted, or deployed
separately, and stored pages and their images would still show.

The editor's live preview keeps to the rule. It is a page in the renderer's
half, shown in a frame. The manager knows its address and the messages they
exchange, and still imports no component.

## The page JSON format

A page is a tree of component instances. This section is the short version.
[docs/page-json.md](docs/page-json.md) is the full guide to writing a page
by hand: every component and prop, the rules each value follows, how to load
a file, and what each error message means.

The types are in `src/page-model/types.ts`:

```ts
type ComponentInstance = {
  id: string;                       // unique within the page
  type: string;                     // which component, e.g. "card-grid"
  props: Record<string, unknown>;   // that component's own settings
  children?: ComponentInstance[];   // only for components that hold others
};

type PageDocument = {
  schemaVersion: 1;
  siteId: string;                   // the site it belongs to
  path: string;                     // "/" or "/teams"
  title: string;
  content: ComponentInstance[];
};
```

An example: a shortened copy of `seed/pages/harbour-sevens.teams.json`, with
a link added to one card to show an optional field. It has a section that
holds a banner and a second, nested section.

```json
{
  "schemaVersion": 1,
  "siteId": "harbour-sevens",
  "path": "/teams",
  "title": "Teams",
  "content": [
    {
      "id": "teams-wrapper",
      "type": "section",
      "props": { "layout": "full", "background": "none" },
      "children": [
        {
          "id": "teams-intro",
          "type": "banner",
          "props": {
            "heading": "The teams",
            "message": "Two pools of two. The top side from each pool plays in Sunday's final."
          }
        },
        {
          "id": "teams-pools",
          "type": "section",
          "props": { "layout": "two-column", "background": "light" },
          "children": [
            {
              "id": "teams-pool-a",
              "type": "card-grid",
              "props": {
                "title": "Pool A",
                "cards": [
                  {
                    "heading": "Coral Coast",
                    "image": { "url": "/seed/harbour-sevens/coral-coast.svg", "alt": "" },
                    "link": { "label": "See all teams", "href": "/teams" }
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

Notes:

- MongoDB stores this document as it is, plus `_id`, `createdAt` and
  `updatedAt`. Nothing in it refers to the manager.
- `id` is what the editor uses to select, move and remove an instance, and
  where it attaches problems. The manager creates ids with
  `crypto.randomUUID()`. The seed files use readable ones.
- `props` holds only data. There is no HTML, no styling and no theme value in
  a page, which is why the same page content can be themed per site.
- A page can outlive a component. An instance whose `type` is no longer in
  the library is skipped when rendering, and the editor shows it as an
  unknown component that can be removed.
- `schemaVersion` is there so a future change to the format itself can be
  detected and migrated. So far only the import reads it: it refuses a file
  that is not version 1.
- A page goes in and out of the manager as this document. **JSON** in the
  editor exports the page as a file, or replaces its components with a
  file's. **Import a page** on a site's list of pages creates a page from a
  file. `siteId` is not read on the way in: a page belongs to the site it is
  imported into, so one file works on any site.

## Components

A component is two things in one folder of `src/library`:

- **A definition**: plain data that names the component and lists its
  editable props as fields.
- **A React component** that receives those props.

There are six kinds of field (`src/library/types.ts`):

| Kind | Stored as | Used for |
| --- | --- | --- |
| `text` | string | A line of text, or a paragraph with `multiline`. Can be `required`. |
| `url` | string | Where a link goes. Must be a path on the site (`/about`) or start with `http://` or `https://`. |
| `image` | string | An image's address, under the same rules as a link's. Its form shows the picture, and can upload a file and fill the address in. |
| `select` | one of its option values | A fixed choice, such as a section's layout. Has a `default`. |
| `group` | object | Fields that belong together, such as an image's address and alt text. An `optional` group can be left out, like a card's link. |
| `list` | array | A repeatable item, such as the cards in a card grid. |

Groups and lists can hold any field, including each other. A card grid is a
list of groups, each with a nested group for the image and an optional group
for the link.

The manager draws every form from these descriptions
(`src/manager/FieldEditor.tsx`). There is one input per kind of field, and
groups and lists call back into the same code for the fields inside them.
No component has a form of its own.

The same descriptions are checked in three places, always by
`src/library/validate.ts`: in the browser when saving, on the server before
anything is stored, and in the renderer before a component is drawn.

### Add a new component

The commit "Add a third component: Banner" is a worked example. It adds three
files, changes one line in each of two lists, and touches nothing in
`src/manager`.

1. **Describe it.** Create `src/library/banner/definition.ts` (shown here as it
   was in that commit, without its placeholder text):

   ```ts
   import { defineComponent } from "../types";

   export const bannerDefinition = defineComponent({
     type: "banner",              // stored in page JSON, so never rename it
     label: "Banner",             // what editors see
     description: "A large heading with a short message and an optional button.",
     summaryField: "heading",     // shown beside it in the page outline
     fields: {
       heading: { kind: "text", label: "Heading", required: true },
       message: { kind: "text", label: "Message", multiline: true },
       button: {
         kind: "group",
         label: "Button",
         optional: true,
         fields: {
           label: { kind: "text", label: "Button text", required: true },
           href: { kind: "url", label: "Button address", required: true },
         },
       },
     },
   });
   ```

   For an image, use the fields in `src/library/image-fields.ts`, as Banner
   does now: its address and its alt text.

2. **Draw it.** Create `src/library/banner/Banner.tsx` (and a CSS module if
   it needs one). Its props are the fields above. Build it from the
   primitives so it picks up each site's theme.

3. **Register it.** Add the definition to the list in
   `src/library/definitions.ts` and the component to the map in
   `src/library/components.tsx`. If you forget the second one, TypeScript
   refuses to build.

It now appears in the manager's "Add a component" dialog with a working form,
and renders on every site. For a component that holds others, set
`acceptsChildren: true` and render `children`, as Section does.

### Add a prop to an existing component

1. Add a field to the component's `definition.ts`.
2. Add the prop to the component's props type and use it in the JSX.

Pages saved before an optional prop existed need no migration. When a page
is rendered or opened in the editor, `fillGroup` gives every missing prop its
empty value: `""` for text, the `default` for a select, `[]` for a list.

A new `required` text or address is different. Its empty value fails the
check, so every instance saved before it is left off the public page until an
editor fills it in. On a component that pages already use, add a new prop as
optional.

### Add a new kind of field

Add its type to `Field` in `src/library/types.ts`. TypeScript then reports an
error at each of the three places that need a new `case`: two in
`validate.ts` (its empty value and its rules) and one in
`src/manager/FieldEditor.tsx` (the input to draw).

## Sites and themes

A site is one document in the `sites` collection: a name, the hostnames it
answers on, its navigation and its theme (`src/site/types.ts`). The theme is
a set of design tokens: nine colours, two font stacks, heading weight, case
and spacing, and two corner radii.

Both sites, with their themes, come from `seed/sites.json`. The brief says
sites are seeded and not edited in the manager, so there is no screen for
them. To change a theme, edit that file and run `npm run seed`. The one choice
of colour an editor has is a Section's background. The page stores its name,
such as `brand`, and the theme decides the colour.

Components never read the theme. The site layout turns it into CSS variables
on `<body>` (`src/site/theme-css.ts`), and `src/renderer/site.css` defines
three **surfaces** on top of them: the page, a "Subtle" section and a "Brand"
section. A surface sets the working colours for everything inside it. So a
Button does not know where it is: inside a brand-coloured section it reads
that surface's colours and reverses by itself.

The seed script refuses a theme whose text is hard to read
(`src/site/contrast.ts`). It measures six text and background pairs per theme
against 4.5:1. The lowest in the two demo themes is 5.66:1.

Everything on the two demo sites is made up: the clubs, the players and the
teams.

## Routing and 404s

`src/proxy.ts` looks at the hostname of each request. A manager hostname
passes straight through. Any other hostname is rewritten to the single public
route, `src/app/(sites)/s/[domain]/[[...path]]`, which finds the site by
domain and then the page by site and path. Both lookups use a unique index.

If either is missing the route calls `notFound()` before any of the response
has been sent, so the visitor gets a real HTTP 404 status and the site's own
not-found page. A path that exists on one site is a 404 on the other.

## Pre-rendering

In production a public page is rendered before anyone visits it, and that
copy is kept in Redis until the page changes.

1. **A server starts.** `src/instrumentation.ts` requests every page of every
   site, as a visitor would. Next.js renders each one and hands it to
   `src/cache/page-cache.mts`, which puts it in Redis.
2. **Someone visits.** The page comes from Redis. MongoDB is not read.
3. **Someone saves a page.** The server action calls `revalidatePath`, and the
   cache notes in Redis the time that page changed. From then on no server
   uses a copy rendered before that time. Once the editor has their answer,
   the server requests the page itself, so the new copy is waiting for the
   next visitor.

- A copy is dated by when its rendering began. So if a save lands in the
  middle, the copy is already out of date when it is stored, and is not used.
- A 404 is never stored. If it were, anyone could fill Redis by asking for
  addresses that do not exist.
- Copies belong to one build, because a page's HTML names that build's
  stylesheets. A new build starts with none.
- The manager and its preview are never stored. They always read MongoDB.
- Redis is optional. Without it each page is rendered when it is asked for. If
  a page is saved while Redis is away, the note of that is sent as soon as
  Redis is back.
- `npm run seed` puts every copy out of date. A change made any other way,
  such as by hand in MongoDB, can take an hour to show: that is the age at
  which a copy is rendered again, by the next visit to it.

## Key decisions and trade-offs

**A small field format of my own, not Zod or JSON Schema.** A definition has
to do three jobs: draw a form, validate, and fill in defaults. It also has to
be sent to the browser as data. A plain object with five kinds of field does
all of that, and the validator for it is about 200 lines that I can explain
line by line. The cost is that it has few rules (no length limits or patterns
yet), and each component's TypeScript props type is written by hand next to
its definition rather than derived from it.

**The editor saves the whole page.** The editor holds the tree in React state
and edits it with the pure functions in `src/page-model/tree.ts`, then sends
all of it. A page is never half saved and the server can validate it in one
go. The cost is that two people editing the same page overwrite each other.
The fix would be to send `updatedAt` with the save and refuse it if the page
has changed since.

**Every instance has an id.** It gives the editor something stable to select,
move and attach problems to, and it would let a later version save single
changes.

**An instance can have a name.** `name` is optional and only the manager reads
it: three Sections on one page become "Hero", "Pools" and "Tickets" in the
tree. It is kept in the page JSON and not beside it, so it comes along when a
page is exported, imported or duplicated. The renderer never looks at it, so a
name cannot reach a visitor.

**The live preview is the real page, in a frame.** The editor frames
`/preview/<page id>`, a route in the renderer's half that draws the page in
the site's own document, with its theme and components. On every edit the
editor sends the unsaved tree with `postMessage`, and the preview answers
with the id of a component that was clicked, or the path of a menu link. A
frame keeps the site's CSS out of the manager, and gives the page a width of
its own to respond to, which is
how the Phone size works. A draft is never written to the database, so it
cannot reach the public site. `PreviewTree` wraps each instance to carry its
id, and shares `resolveInstance` with `RenderTree`, so both decide in the
same way what can be drawn. The cost is a second document to load, and a
second walk of the tree to keep in step with the first.

**Dragging is pointer events, not a library.** Every place a component can go
is an element in the list, with no height and a name made of two ids: the
parent's and the next neighbour's. While a row is dragged it is taken out of
the list, and `useDragToMove` opens the place nearest to it, so the list always
looks as it would after a drop. The places are measured once, when the drag
starts, so rows that slide on screen cannot change which place is nearest.
Letting go calls `moveInstanceTo` in `src/page-model/tree.ts`. The editor makes
the same call during the drag, and sends the result to the preview only. A
place names a neighbour, not a position number, so nothing has to be renumbered
when the component is first taken out of where it was. The hook knows nothing
about components, so the cards in a form use it too. With pointer events a mouse, a finger and a pen all work the same way, and
a drag carries on over the preview's frame, where HTML's own drag and drop
would not. The cost is that there is no dragging with the keyboard. The arrows
and **Placed in** on a component's form make the same moves there.

**Unsaved changes are kept for each page, in the browser.** Moving between
pages should be one click with no question, and should never lose work. So
drafts are held in a React context in the manager's root layout
(`src/manager/Drafts.tsx`), which stays in place while pages come and go. They
survive the Back button and every link in the manager. They do not survive
closing or reloading the tab, so the browser asks first. Nothing about them
reaches the server, so there is nothing to clean up.

**Pages nest by their paths.** `/squad/juniors` is listed under `/squad`. It
is worked out each time from the paths (`src/page-model/page-tree.ts`) and not
stored, so it can never disagree with the addresses. The cost is that pages
cannot be put in an order of their own.

**A file is treated like any other edit.** Export writes the editor's own
copy of the page to a file, in the browser. Import into an open page is read
in the browser too, and replaces the page's components as an unsaved change.
So it shows in the preview, can be undone, and reaches the database through
Save page and its checks, with no second way in. Creating a page from a file
does go to the server, where it gets the same checks as a save. Both read the
file with one function, `readPageFile` in `src/page-model/file.ts`. The cost
is that an import replaces all of a page's components: there is no merging.

**Stored JSON is never trusted.** The server action checks the shape of the
tree, then every prop against its definition, and stores only what the
definitions describe. The renderer checks again and skips an instance it
cannot draw, with a warning in the server log, rather than failing the page.
Link and image addresses must be a site path or an `http(s)` address, which
keeps out `javascript:` links.

**Hostname routing.** A site is found by the hostname a visitor used, as it
would be in production, so public URLs are just the site's own paths.
Locally this relies on `*.localhost` names.

**Public pages are rendered once and kept in Redis.** Two things had to stay
true: an unknown path returns a real 404, and a saved edit is live on the next
refresh. So Next.js's Cache Components is off (with it on, a page that finds
out at request time that it is missing is streamed with a 200), and each save
says which page is out of date. Next.js would keep rendered pages on each
server's own disk. Its `cacheHandler` setting lets `src/cache/page-cache.mts`
keep them in Redis instead, so that servers share them and one save replaces a
page for all of them. On a single server Next.js's own store would be enough.
`next build` does not give the pages it renders to a cache handler, so a
server renders them as it starts. The costs: one more service to run; Node
22.18 or newer, because Node loads the cache handler itself without Next.js
compiling it, and older versions cannot read TypeScript; and servers whose
clocks agree, because they decide whether a copy is older than a save.

**Redis is allowed to fail.** It only holds copies. A page or a save waits for
it no longer than 0.3 seconds (one second when a server first looks for it),
then carries on with MongoDB alone.

**The official MongoDB driver, not Mongoose.** A page is already a JSON tree
with its own validator. A Mongoose schema would describe the same thing a
second time. The unique index on site and path is what stops two pages
taking the same address, including when two people save at once.

**Plain CSS Modules and CSS variables, no UI kit.** Theming is the core of
the task, so I wanted the path from a theme token to a pixel to be short and
visible: token, CSS variable, surface, component.

**System fonts only.** Nothing is downloaded and there is no layout shift.
The cost is that the heading typefaces (DIN Condensed, Avenir Next) are macOS
fonts. On other systems the sites fall back to similar fonts, and still
differ in colour, case, weight and shape. Each theme would ship its own font
files in a real product.

**Uploaded images are kept in MongoDB.** The `images` collection holds the
files, and `/images/<id>.jpg` serves them on every site. The database is
already there and every server can reach it. A folder on disk would be lost on
a host such as Vercel, and file storage such as S3 needs an account and keys
to run this project at all. An image's id is worked out from its bytes, so the
same picture is stored once and a browser can keep it for good. A page still
holds only an address: the page format did not change, and a picture can also
come from any other site. The cost is that a database is an expensive place to
serve files from. With real traffic I would put a CDN in front, then move the
files to file storage, which changes `src/db/images.ts` and little else.

**The browser makes an image smaller before uploading it.** A photo straight
from a camera can be 8 MB. The browser draws it again at no more than 1600
pixels a side, so an editor never has to resize one, and the server needs no
image library. A redrawn photo also loses the place it was taken, which a
camera writes into the file. The server does not take the browser's word for
any of this. It accepts up to 4 MB, and tells what a file is from its first
bytes: JPEG, PNG, WebP or GIF. SVG is refused, because it can hold scripts.

**A plain `<img>`, not `next/image`.** Editors can paste an image address
from any host, and `next/image` only accepts hosts listed in the config. What
it would do for an uploaded image is mostly done by the step above.

**"Light" is called "Subtle" in the manager.** The brief names the section
backgrounds none, light and brand, and those are the stored values. On the
dark Ironbarks theme that background is not light, so the label editors see
describes what it does instead.

**Undo instead of "Are you sure?".** Removing a component, a card or a link
offers Undo until the next change. So does moving a component, and so does
replacing a page's components from a file. Nothing in the manager is
irreversible until Save page.

**Design.** The manager is black and white in system type and follows the
reader's light or dark setting. It has no colour of its own: the only colour
on screen is each site's, shown as a small mark beside its name, so the two
sites carry the personality. Pages and components are drawn as the same kind
of tree, one step in for each level with a line down the side, so that what is
inside what can be seen at a glance. A wide window shows the trees, the preview
and one form side by side. A narrower one shows the form in the trees' place,
and a phone shows the trees, the form or the preview. Controls are at least
44px tall on touch screens, every text pairing measures 5.4:1 or better, and
problems are shown with an icon and words, never colour alone.

## What is not built

- **Sign-in.** The brief says none is needed. Anyone who can reach the
  manager can edit. The server actions are where a check would go.
- **Editing a site or its theme in the manager.** Left out on purpose: the brief
  says sites are seeded. "Sites and themes" above says how to change one.
- **Stretch goals done:** live preview, and reordering. The editor shows the
  page as it is edited, at desktop and phone widths, and a click on the preview
  opens that component's form. Components are reordered, and moved in and out
  of Sections, by dragging them in the tree or with buttons.
- **Stretch goals not done:** deploying to Vercel, a data-driven component
  and draft/publish. Save page publishes straight away, and the editor says
  so.
- **Stretch goal partly done:** tests. There are 79 unit tests on the page
  tree, the tree of pages, validation, page details, page files, uploaded
  images, preview messages, the editor's keys, stored pages and contrast.
  None render components or drive a browser.
- Deleting a page.
- Choosing from the images already uploaded, and clearing out those no page
  uses any more. An image stays in the database once it is there.
- Dragging in the preview itself, and dragging a component to another page. A
  component moves within its page, in the tree.
- Each theme has one appearance. A site does not follow the visitor's light
  or dark setting.
- After a removal, keyboard focus is not moved to a sensible neighbour.

What I would do next, in order: the `updatedAt` check on save, draft and
publish (a `published` copy of `content` on the page document), then a
data-driven component whose definition names a data source and whose React
component fetches on the server.

## Hours spent

Roughly 5 to 7 hours.

## AI tools used

- I used Claude, through Claude Code (Anthropic's coding agent).
- `AGENTS.md` is written by Next.js 16's dev server for coding agents. It is
  not part of the app.
