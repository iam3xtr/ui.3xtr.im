# CLAUDE.md

> **Read [`AGENTS.md`](AGENTS.md) first** — it contains platform overview, cross-repo rules,
> encoding requirements, and documentation obligations shared across all repos and all AI assistants.

This file covers only what is specific to **trickster-ui-kit**: the Trickster design-system kit.

## Commands

```bash
npm run dev                       # Dev server (Vite)
npm run build                     # Production build
npm run preview                   # Preview production build
npm run lint:style                # Stylelint for src/**/*.{css,scss} + guard:no-component-styles
npm run guard:no-component-styles # Fails if any src/**/*.vue still has a <style> block
```

Both `lint:style` checks require no network access and are what CI
(`.github/workflows/deploy-pages.yml`) runs before building and deploying to GitHub Pages
on push to `main` (post-merge gate, not a PR gate — there is no `pull_request` trigger).

## Stack

Vue 3 (plain JavaScript, `<script setup>`, no TypeScript) · Buefy 3.x · Bulma 1.x ·
Vue Router 4 · Pinia · Dart Sass · Vite · `vite-svg-loader`

## What this repository is

`trickster-ui-kit` is **not** a general Buefy showcase — it is the reference
implementation of the `get.3xtr.im` personal-cabinet UI/UX contract: same routes, same
markup anatomy, same class names, same icon set, working without a backend. Design
changes are made here, verified across every kit screen in one pass, then ported into
`get.3xtr.im` via that repo's `npm run ui-kit:update`. The full contract — tokens, shell
architecture, component patterns, `--c-*`→`--tr-*` mapping, icon registry — is
documented in [`docs/design-system.md`](docs/design-system.md); source-of-truth order
when something disagrees: `src/styles/*.scss` (compiled contract) > kit screens in
`src/components/` > `docs/design-system.md` > `docs/agent-migration-guide.md`.

## Styling rule (hard constraint)

**All styles live in exactly one file: [`src/styles/trickster-buefy.scss`](src/styles/trickster-buefy.scss)**,
plus the token partial it imports,
[`src/styles/_trickster-tokens.scss`](src/styles/_trickster-tokens.scss) (brand colors,
neutral palette, typography, spacing, geometry). No `.vue` component under `src/` may
contain a `<style>` block — this is enforced by
[`scripts/no-component-styles.js`](scripts/no-component-styles.js) (`npm run
guard:no-component-styles`), run in CI via `npm run lint:style` alongside Stylelint
(`stylelint.config.js` bans `!important` and duplicate selectors). When adding a rule,
put it in the matching banner-commented section of `trickster-buefy.scss` (tokens,
shell, navigation, toolbar, tabs, tables, forms, cards and catalogs, states, overlays,
tariffs, conversations, utilities, responsive — see the file's own table of contents at
the top) rather than creating a new file or an inline component style. Inherited
Bulma/Buefy specificity overrides are explicitly marked as `Stage A3 debt` in the
stylesheet; do not add new `!important` declarations or suppressions.

## Icons

UI icons are Material Design Icons only (`b-icon`, `@mdi/font`). Custom SVG
(`src/assets/icons/`) is allowed only where MDI has no equivalent — currently LLM vendor
logos (anthropic, cerebras, cohere, deepseek, fireworks, gemini, gigachat, google, grok,
…) and model-kind icons. Every custom icon must be registered with justification in
`docs/design-system.md` ("Иконки" section); the kit-name → MDI-name mapping consumed by
`get.3xtr.im` lives in `docs/agent-migration-guide.md`. An icon absent from the registry
does not ship. Rendering goes through the shared
[`src/components/common/Icon.vue`](src/components/common/Icon.vue).

## Loader

A single shared component, [`src/components/common/Loader.vue`](src/components/common/Loader.vue),
covers all loading indication: three sizes (`inline`/`section`/`screen`), theme-aware
color via `currentColor`, static variant under `prefers-reduced-motion`. Rules are in
`docs/design-system.md` ("Загрузчик" section). Do not introduce a second loading
component or ad hoc spinners.

## Structure

```
src/
  router.js            # Routes for every kit screen (hash history when VITE_ROUTER_MODE=hash)
  navigation.js         # Nav item registry consumed by Sidebar/Navbar
  components/           # One component per cabinet screen (Dashboard, Agents, Conversations,
                         #   Knowledge, Integrations, Settings, Workspace, WorkspacePlan, UiKit, ...)
  components/common/    # Shared primitives: Icon.vue, Loader.vue
  composables/          # Shared composition functions
  stores/                # Pinia stores backing kit-only demo state (no real API)
  styles/                # The two managed stylesheets — see "Styling rule" above
  assets/icons/          # Custom SVGs — see "Icons" above
ui-kit.html              # Static HTML examples of raw Bulma-class elements
docs/design-system.md            # The design contract (canonical)
docs/agent-migration-guide.md    # Icon/content-pattern mapping for consuming apps
```

Kit screens carry no backend: they are simplified, working copies of `get.3xtr.im`'s
real screens with fixture/demo data, existing purely to let a design change be reviewed
in one pass before being ported downstream. Do not add real API calls, auth, or
persistence here — that belongs in `get.3xtr.im`.

## Target versions

Vue 3 plain JavaScript (no TypeScript, `<script setup>`), Buefy 3.x, Bulma 1.x, Dart
Sass. A Vue 2 / Buefy 0.x cabinet needs a separate legacy-import variant — do not add
Vue-2-compatible syntax here.

## Theming

Theme is switched via `document.documentElement.dataset.theme = "light" | "dark"` and
persisted under the `trickster-theme` `localStorage` key in the kit's own examples;
`get.3xtr.im` has its own theme store that mirrors the same `dataset.theme` contract —
see `docs/design-system.md` for the full `--c-*`→`--tr-*` mapping consumed there.

## Deployment

Static build published to GitHub Pages via
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) on push to
`main`: `npm ci` → `npm run lint:style` → `npm run build -- --base=...` (with
`VITE_ROUTER_MODE=hash`, since GitHub Pages serves from a subpath and has no server-side
history-mode fallback) → upload/deploy Pages artifact. There is no `pull_request`
trigger, so this is a post-merge gate, not a PR gate.

## Downstream sync

Only two files are meant to leave this repository: `src/styles/_trickster-tokens.scss`
and `src/styles/trickster-buefy.scss`. `get.3xtr.im` tracks them via
`ui-kit.lock.json` (pinned upstream commit + checksums) and `ui-kit.allowlist.json`
(one-to-one path mapping); `npm run ui-kit:update` there stops on local dirt, downloads
only changed managed files, and advances the lock — it never touches Vue components or
product-specific CSS on the consuming side. Do not restructure or rename these two files
casually: a rename or split changes the sync contract and requires updating
`get.3xtr.im`'s allowlist in the same effort. Everything else in this repo (components,
router, stores, `ui-kit.html`) is reference/demo material and is **not** synced
automatically — changes to component markup/anatomy are ported manually and reviewed
against `docs/design-system.md`.

## Backend changes

This repository has no backend. If a design change here implies an API or data-shape
change for `get.3xtr.im`, document the need in `docs/design-system.md` or `.plan`/`.todo`
rather than reaching into `get.3xtr.im` or `api.3xtr.im` to change it — that is a
separate, coordinated task per [`AGENTS.md`](AGENTS.md#boundaries).
