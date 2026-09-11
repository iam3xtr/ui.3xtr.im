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
npm run test:unit                 # Vitest — tests/unit/**, no network
```

Both `lint:style` checks require no network access and are what CI
(`.github/workflows/deploy-pages.yml`) runs before building and deploying to GitHub Pages
on push to `main` (post-merge gate, not a PR gate — there is no `pull_request` trigger).
`test:unit` (Vitest, added Task A6.1) is not yet wired into that workflow; run it manually
for any change under `src/stores/**` or `src/components/**`. Store tests run under Node;
component tests (added Task A6.3, `@vue/test-utils` + `jsdom`, config in
`vitest.config.js` — separate from `vite.config.js`, which the app build does not need a
`test`/`jsdom` dependency for) mount the real `Buefy` plugin rather than stubbing
individual components, and stub only the globally-registered `icon` component to avoid
pulling in `vite-svg-loader`'s asset resolution.

## Verification policy

A manual visual regression pass (comparing a screen in light/dark at
`360/768/1024/1280/1440px`, exercising overlay/keyboard interaction, etc.) is **not** a
blocking acceptance criterion for any task or stage in `.plan`/`.todo`, at any point —
there is no headless browser in the agent environment to run one. The required checks
are the narrow, automatable ones: `lint:style`, `guard:no-component-styles`, `build`,
`git diff --check`, plus whatever a specific task's own acceptance criteria name. When
the user asks for a review or to close a task/stage, treat any necessary user-side
review as already done — do not re-ask for confirmation or hold a task in `review`
pending a manual matrix run. Where older wording in `.plan`/`.todo` still frames the
matrix as a gate, that's leftover phrasing to fix in passing, not an active requirement.

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
tariffs, conversations, utilities, responsive, deprecated aliases — see the file's own
table of contents at the top) rather than creating a new file or an inline component
style. A class renamed for the A3 contract keeps its old selector as a transitional
`@deprecated` alias in that last section until Stage B4; log every alias in
`docs/agent-migration-guide.md` ("Реестр алиасов миграции"). Inherited
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
  router.js              # Routes mirror the cabinet's real paths (hash history when
                         #   VITE_ROUTER_MODE=hash): /, /agents/**, /conversations/**,
                         #   /knowledge/**, /workspace/**, /profile/**, /auth/**, /kit, /404
  navigation.js         # Nav item registry consumed by Sidebar/Navbar
  components/           # Catalog/top-level screens (Dashboard, Agents, Conversations,
                         #   Knowledge, Workspace, WorkspaceSettings, WorkspacePlans, UiKit,
                         #   NotFound, ...) — each catalog's detail lives in its own
                         #   domain subdirectory below, route-driven off the catalog
  components/agents/    # Agent detail: route-driven shell + its Navbar-tab screens (Task A5.4)
  components/channels/  # Channel catalog nested under agent detail (`/agents/:id/channels`, Task A5.5)
  components/knowledge/ # Collection detail: route-driven shell + files/settings/statistics tabs (Task A5.6)
  components/conversations/ # Conversation detail: route-driven shell + history/settings tabs (Task A5.7)
  components/workspace/ # Workspace tabs beyond Settings/Plans: usage, members, billing (Task A5.8)
  components/profile/   # Profile shell + settings/security tabs (Task A5.9)
  components/auth/      # Auth container + login/signup/forgot/verify/invite screens (Task A5.10)
  components/common/    # Shared primitives: Icon.vue, Loader.vue, Toolbar/NavbarMenu/AsyncState/...
  composables/          # Shared composition functions
  stores/                # Pinia stores backing kit-only demo state (no real API): one file per
                         #   domain (agents, channels, knowledge, conversations, workspace,
                         #   members, profile, auth, models, apiKeys) plus modal/toaster (Buefy
                         #   overlay adapters). `models.js` is the local model catalog fixture
                         #   consumed by `agents.js`'s BYOK contract (Task A6.1); `apiKeys.js` is
                         #   the per-workspace saved-OpenRouter-key fixture BYOK agents reference
                         #   by id instead of storing key text (Stage A6 fix, post-review).
  styles/                # The two managed stylesheets — see "Styling rule" above
  assets/icons/          # Custom SVGs — see "Icons" above
tests/unit/stores/               # Vitest unit tests for Pinia stores (Task A6.1); no network
tests/unit/agents/                # Vitest component tests (Task A6.3, `@vue/test-utils`);
                                  #   no network — `npm run test:unit`
tests/unit/components/            # Vitest component tests for top-level catalog screens
                                  #   (e.g. Agents.vue) — same runner/no-network rule
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
router, stores) is reference/demo material and is **not** synced
automatically — changes to component markup/anatomy are ported manually and reviewed
against `docs/design-system.md`.

## Backend changes

This repository has no backend. If a design change here implies an API or data-shape
change for `get.3xtr.im`, document the need in `docs/design-system.md` or `.plan`/`.todo`
rather than reaching into `get.3xtr.im` or `api.3xtr.im` to change it — that is a
separate, coordinated task per [`AGENTS.md`](AGENTS.md#boundaries).
