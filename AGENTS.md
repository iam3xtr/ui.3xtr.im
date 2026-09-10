# AGENTS.md

Shared context for AI coding assistants working on the **3xtr.im** platform.

If the current repository has `CLAUDE.md`, read it after this file. `AGENTS.md` is
platform-wide; `CLAUDE.md` is repo-specific.

## Platform

3xtr.im is a multi-tenant AI agent platform split across four product repositories,
plus this design-system repository:

| Repo | Role |
|---|---|
| `api.3xtr.im` | Go REST API: auth, RBAC, workspaces, agents, conversations, knowledge, LLM orchestration |
| `get.3xtr.im` | Vue 3 admin SPA for workspace owners and operators |
| `chat.3xtr.im` | Go gateway + Nuxt 3 public chat, widget, webhook integrations |
| `actor.3xtr.im` | Python extraction service for RAG document ingestion |
| `trickster-ui-kit` | Vue 3 + Buefy design-system kit — a backend-less working copy of `get.3xtr.im`'s UI/UX contract (this repository) |

## Boundaries

- Work only inside the invoked repository. Do not edit sibling repositories.
- This repository (`trickster-ui-kit`) has **no backend and no API dependency**. It is
  the reference implementation of `get.3xtr.im`'s UI/UX contract: same routes, same
  markup anatomy, same class names, same icon set, without live data. Design edits are
  made here first, verified across every screen in one pass, and only then ported to
  `get.3xtr.im` via that repo's `npm run ui-kit:update`.
- Do not port demo routes, fixtures, or demo-only actions from this kit into
  `get.3xtr.im`; only the design contract (tokens, markup anatomy, class names) is meant
  to travel. `get.3xtr.im` owns real data, permissions, and API calls.
- `trickster-ui-kit`'s two managed stylesheets — `src/styles/_trickster-tokens.scss` and
  `src/styles/trickster-buefy.scss` — are consumed verbatim by `get.3xtr.im` through its
  `ui-kit.lock.json`/`ui-kit.allowlist.json` sync tooling. A change here is a change to
  what ships downstream; keep it visually intentional and covered by
  `docs/design-system.md`.
- Before changing any endpoint, field, payload, error shape, or cross-repo behaviour,
  verify affected consumers and coordinate breaking changes. (This repo has no API
  surface of its own, but its stylesheet and markup contract is consumed by
  `get.3xtr.im`, so the same coordination rule applies to contract changes.)

## Encoding

- Read and write repository text files as UTF-8.
- Preserve existing line endings and BOM state.
- On Windows PowerShell 5.1, never write files with `>`, `>>`, `Out-File` without
  `-Encoding UTF8`, `Set-Content` without `-Encoding UTF8`, or Python `open(..., "w")`
  without `encoding="utf-8"`.
- After editing files with Cyrillic or accented text, read them back and check that the
  text is not corrupted.

## Documentation

After every meaningful component, style, or contract change:

- Update `docs/design-system.md` — the single source of truth for the visual and
  component contract. It documents the **current** contract, not the target one; any
  declared-but-unimplemented rule must be marked explicitly in its
  "Расхождения контракта и реализации" section.
- Update `docs/agent-migration-guide.md` when custom icon names, content patterns, or
  the "kit name → MDI name" mapping change.
- Update `README.md` when the composition of the kit, target versions, or the
  install/connection instructions change.
- This repository has no `CHANGELOG.md`; history of contract changes is tracked through
  `.plan`/`.todo` and Git history, and consumed downstream via `get.3xtr.im`'s own
  `CHANGELOG.md` when the sync lands there.

## Planning

- `.plan` holds the active epic/workstream; keep completed stages for regression review.
- `.todo` holds decomposed tasks for the current stage only.
- Long-term or cross-repo backlog belongs in GitHub Issues, not local planning files.
- Before adding tasks, check `.plan`, `.todo`, and open Issues to avoid duplicates.
- Development workflow may use locally configured Codex and Claude Code skills such as
  `plan-create`, `plan-review`, `stage-decompose`, `stage-run`, `stage-review`,
  `fix-it`, `fix-review`, and `stage-close`; those skills are not part of this repo.
- For GitHub CLI work, use REST through `gh api`; avoid GraphQL-dependent commands.

## Planning File Shape

Use these fields consistently so local skills and agents can resume work safely.

`.plan` structure:

- `# PLAN: <workstream name>`
- `Дата актуализации: YYYY-MM-DD`
- `Источники: <files, docs, issues, user request>`
- `Ограничения:` repo boundaries, contract constraints, verification requirements.
- Group stages by `## <module>` and optional `### <functional area>`.
- Stage heading: `### [P0/P1/P2] Stage <N>. <short title>`.
- Required fields per stage: `Статус`, `Источник`, `Контекст`, `Что сделать`,
  `Область`, `Зависимости`, `Критерии приёмки`.
- Valid stage statuses: `active`, `blocked`, `deferred`, `done`, `issue #N`.

`.todo` structure:

- `# TODO: <current plan stage>`
- `Дата актуализации: YYYY-MM-DD`
- `Статус: <relationship to current .plan stage>`
- `## Назначение` explains which stage is decomposed and what is out of scope.
- Group tasks by `## <module>` and `### <functional area>`.
- Task heading: `### [P0/P1/P2] <short task title>`.
- Required fields per task: `Статус`, `Источник`, optional `Покрытие Issues`,
  `Описание`, `Область`, `Критерии приёмки`.
- Valid task statuses: `todo`, `active`, `blocked`, `review`, `done`.
- Remove tasks only after `Статус: done`; never delete unfinished tasks.

## Coding Rules

- Match the existing style and local helper APIs.
- Keep changes scoped to the request; avoid unrelated refactors and new abstractions.
- Do not manually edit generated artifacts unless repo instructions explicitly allow it.
- If the user asks to review, audit, compare, or update docs, stay read-only unless they
  explicitly ask for implementation.
- Run the narrowest relevant formatter, linter, and guard before reporting
  implementation work complete.
- When uncertain about cross-repo impact (especially on the `get.3xtr.im` sync
  contract), stop and ask instead of guessing.
