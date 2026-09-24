Repository-specific context for AI assistants working in **`ui.3xtr.im`**.

Read [`AGENTS.md`](AGENTS.md) first. This file contains only repository-specific
commands, architecture, conventions, invariants, and pointers to canonical documentation.

## Purpose and Boundaries

This repository is the UI/UX reference implementation and design-system workspace for
the 3xtr.im platform.

It is **not** the production `get.3xtr.im` application.

The demo may contain components, stores, fixtures, and route-backed screens for
demonstrating product and design contracts, but it does not own production:

* API clients;
* authentication;
* persistence;
* secrets;
* RBAC enforcement;
* backend business rules.

Do not turn demo fixtures or demo-only behaviour into production contracts.

The repository also owns the source of the published UI packages:

* `packages/ui/` → `@iam3xtr/ui`
* `packages/vue/` → `@iam3xtr/vue`

Production applications consume published package versions rather than copying source
files or styles from this repository.

## Stack

* Vue 3
* Pinia
* Vue Router
* Buefy
* Vite
* SCSS
* Vitest
* JavaScript
* Git submodules for the published package sources

## Commands

```bash
# Development
npm run dev

# Builds
npm run build
npm run build:pages
npm run preview

# Validation
npm run lint:style
npm run guard:no-component-styles
npm run test:unit
node packages/consumers/scripts/run-matrix.mjs

# Releases
npm run release:ui
npm run release:vue
npm run release:all
```

Run the narrowest checks relevant to the change.

Typical repository-wide verification for a UI-contract change includes:

```bash
npm run lint:style
npm run guard:no-component-styles
npm run test:unit
npm run build
git diff --check
```

Use the consumer matrix when changing package exports, peer dependencies, package
integration, or other downstream-facing behaviour.

## Repository Structure

```text
src/components/                demo screens and kit-specific components
src/components/agents/         agent detail and creation flows
src/components/knowledge/      collections and knowledge content
src/components/conversations/  conversation history and settings
src/components/workspace/      usage, members, billing, audit
src/components/profile/        profile, security, notifications, help
src/components/kit/            interactive design-system reference
src/stores/                    in-memory Pinia demo fixtures
src/locales/                   scoped RU/EN/ES dictionaries

packages/ui/                   @iam3xtr/ui source
packages/vue/                  @iam3xtr/vue source
packages/consumers/            package-consumer fixtures and compatibility matrix
```

## Development vs Published Packages

`npm run dev` intentionally resolves `@iam3xtr/ui` and `@iam3xtr/vue` from their
submodule sources through Vite aliases so library changes are visible immediately
without publishing them first.

Development also builds the custom SVG registry directly from:

```text
packages/ui/src/assets/icons
```

Normal builds and external consumers must behave like real package consumers and use
published exact versions from `node_modules`.

Do not introduce `file:packages/*` as a runtime dependency for production-style builds.

The consumer matrix may install temporary `node_modules` inside package fixtures or
submodules. Remove those temporary installations after the matrix run so file-based
fixtures cannot accidentally resolve a second instance of a peer dependency.

## Design-System Ownership

`@iam3xtr/ui` owns the visual contract:

* design tokens;
* theme CSS;
* shared assets and registered custom icons.

`@iam3xtr/vue` owns reusable Vue components and composables.

Use shared package components instead of creating local copies when the required
contract already exists.

Route-aware shared components such as navigation primitives belong to the documented
`@iam3xtr/vue` exports.

Use Buefy for standard controls, overlays, tables, pagination, and similar primitives
instead of implementing parallel local equivalents.

If a shared package cannot express a required contract, document the gap instead of
copying and modifying package markup locally.

## Styles

The canonical token and theme sources are the published `@iam3xtr/ui` style exports.

Do not create a local mirror of the theme or token layer.

Component `<style>` blocks under `src/**/*.vue` are prohibited by default.

A demo-only exception is allowed only when the style:

* genuinely does not belong to the public package contract;
* uses exactly one `<style scoped>` block;
* is preceded by:

```html
<!-- kit-style-exception: reason -->
```

Keep such exceptions narrow.

Validate style ownership with:

```bash
npm run lint:style
npm run guard:no-component-styles
```

Do not bypass the guard by moving shared package CSS into unrelated local files.

## Icons

Use MDI for ordinary interface icons.

Custom SVG icons are allowed only through the documented
`@iam3xtr/ui` icon registry under:

```text
packages/ui/src/assets/icons/
```

Do not create application-local copies of shared icons.

When changing icon exports, aliases, or migration rules, update the corresponding
migration documentation.

## Package Contracts

Treat `packages/ui` and `packages/vue` as public libraries.

When changing them:

* preserve explicit public exports;
* avoid undocumented deep-import contracts;
* consider existing consumers before renaming or removing exports;
* keep peer-dependency behaviour intentional;
* run the consumer compatibility matrix for downstream-facing changes;
* update package and migration documentation together with the contract.

Do not infer that demo-only props, fixtures, routes, or state are part of a published
package contract unless they are exported and documented as such.

## Release Process

Package releases are controlled by the repository release scripts.

```bash
npm run release:ui
npm run release:vue
npm run release:all
```

Without explicit execution, release commands perform a dry run.

Supported release modes include patch/minor/major bumps, prerelease variants, and
releasing the version already present in manifests.

`release:all` releases UI before Vue because `@iam3xtr/vue` depends on an exact
`@iam3xtr/ui` version.

The Vue release must not proceed until the required exact UI version is available in
the package registry.

A successful release also updates the root exact package pins, lockfile, submodule
gitlinks, and repository dependency state through the established release workflow.

For workstreams that introduce public package components or style contracts,
plan the release as part of the deliverable. After publication, verify the demo's
tests and production/Pages builds against the newly published exact versions,
not development source aliases. Check affected consumer repositories for existing
upgrade work, then create or update Issues there with the released versions,
migration scope, and verification criteria. Consumer code changes remain in
their own repositories.

Do not manually reproduce or partially emulate the release procedure when the existing
scripts support the operation.

For release execution, recovery, resume behaviour, credentials, tags, and versioning
options, read:

[`docs/release-process.md`](docs/release-process.md)

## Package Registry and Secrets

Published packages are installed from GitHub Packages.

Credentials must never be stored in:

* `.gitmodules`;
* committed `.npmrc` secrets;
* source files;
* generated artifacts;
* logs.

Use the established GitHub token / package-registry mechanism documented in the release
process.

Do not expose package credentials through build arguments or other mechanisms that can
persist them into build or artifact history.

## GitHub Pages and Demo Build

GitHub Pages builds the demo using:

```bash
npm run build:pages
```

The Pages workflow consumes published exact package versions from the registry rather
than relying on checked-out package submodules.

`build:pages` is the special demo build that enables Vue production-devtools support
for inspection of the public reference application.

Normal:

```bash
npm run build
```

and published `@iam3xtr/ui` / `@iam3xtr/vue` artifacts must remain normal production
builds without production devtools enabled.

Do not add an in-DOM devtools interface, remote debugging server, open-editor endpoint,
or similar production surface as part of this mechanism.

## Demo State

Pinia stores under `src/stores/` provide in-memory demo state.

They exist to demonstrate UI behaviour and screen contracts.

Do not interpret fixture values as:

* backend defaults;
* production permissions;
* tariff values;
* production API schemas;
* real persistence behaviour.

When the demo needs to represent a production contract, verify that contract against the
owning repository and documentation rather than deriving it from existing fixture data.

## Consumer Boundary

Do not modify sibling repositories from this workspace.

Changes required in `get.3xtr.im` or another consumer must be made in that repository.

Likewise, do not restore historical local stylesheet copies or source-sync mechanisms
for consumers that have already migrated to published packages.

The preferred downstream path is:

```text
ui.3xtr.im package source
        ↓
published @iam3xtr/ui / @iam3xtr/vue
        ↓
consumer exact package version
```

not source copying or cross-repository file synchronization.

## Documentation

Update [`docs/design-system.md`](docs/design-system.md) when the visual or component
contract changes.

Update [`docs/agent-migration-guide.md`](docs/agent-migration-guide.md) when changing:

* icons;
* aliases;
* package-consumption or migration guidance.

Release versions, workflows, publication credentials, failure recovery, and resume
procedures belong in:

[`docs/release-process.md`](docs/release-process.md)

Keep detailed release mechanics out of `REPO.md`; this file should contain only the
stable rules an assistant needs before starting work.

## Verification

Visual verification is useful for UI changes but is not considered performed in an
environment without browser automation or an actual browser session.

Do not claim visual, responsive, focus, keyboard, or browser-extension behaviour was
verified unless it was actually exercised.

Automated checks and package-consumer tests should still be run where applicable.

For shared-package changes, verify both:

1. the package's own unit/build contract;
2. representative downstream consumption through `packages/consumers/`.

## Cross-Cutting Invariants

* This repository defines the design-system reference and package sources, not production business logic.
* Shared visual contracts belong in `@iam3xtr/ui`.
* Shared Vue behaviour belongs in `@iam3xtr/vue`.
* Demo-specific presentation stays in the demo application.
* Prefer shared packages or Buefy over parallel local primitives.
* Do not duplicate themes, tokens, package components, or shared icons locally.
* Published package consumers use explicit public exports and exact package versions.
* Keep secrets out of source, build metadata, artifacts, and logs.
* Verify downstream compatibility before changing public package contracts.
* Do not modify consumer repositories from this workspace.
