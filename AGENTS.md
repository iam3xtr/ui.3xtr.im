Shared instructions for AI assistants working on the **3xtr.im** platform.

Read this file first. Then, if the current repository contains [`REPO.md`](REPO.md),
read it completely before making changes. `REPO.md` contains repository-specific
commands, architecture, contracts, constraints, and pointers to detailed documentation.

`CLAUDE.md` is a compatibility/bootstrap entry point for assistants that discover Claude
instructions automatically. Repository-specific instructions belong in `REPO.md`, not
in `CLAUDE.md`.

## Platform

| Repository      | Responsibility                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------- |
| `api.3xtr.im`   | Go REST API: authentication, RBAC, workspaces, agents, conversations, knowledge, LLM orchestration |
| `get.3xtr.im`   | Vue 3 SPA for workspace owners and operators                                                       |
| `chat.3xtr.im`  | Go gateway + Nuxt 3: public chat, widget, and webhook integrations                                 |
| `actor.3xtr.im` | Python service for RAG text and metadata extraction                                                |
| `ui.3xtr.im`    | Design-system demo and sources for `@iam3xtr/ui` and `@iam3xtr/vue`                                |

## Work Boundaries

* Work only inside the invoked repository. Do not edit sibling repositories.
* Keep changes within the requested scope. Do not add unrelated features, refactors, or abstractions.
* Before changing an endpoint, field, payload, error, permission, shared UI contract, or other cross-repository behaviour, identify and verify affected consumers.
* Do not copy demo fixtures, mock data, or demo-only behaviour from `ui.3xtr.im` into production applications.
* `actor.3xtr.im` remains an isolated extraction service and must not import code from sibling services.
* Applications consume published `ui.3xtr.im` packages; do not copy their source or styles into consumers.
* When cross-repository impact is uncertain, do not invent a contract. Continue only with work that is safe without that assumption and surface the unresolved dependency when it blocks the task.

Important platform boundaries:

* `get.3xtr.im` uses the HttpOnly authentication cookie issued by the API.
* `chat.3xtr.im` consumes stable API contracts using service credentials.
* Public contracts are owned by the repository that implements them; verify claims against that repository before changing consumers.

## Architecture Status

Distinguish implemented behaviour from plans, proposals, and debt.

Use these statuses when needed:

* `Implemented`
* `Partially implemented`
* `Accepted debt`
* `Planned`
* `Under consideration`
* `Rejected`

Do not describe `Planned`, `Partially implemented`, or `Accepted debt` work as a current guarantee.

Reviews, ADRs, roadmaps, `.plan`, `.todo`, Issues, and risk registers are not evidence
that a runtime contract exists. Verify current behaviour against implementation,
configuration, schema, and canonical documentation.

## Documentation and Context

Do not read the entire `docs/` tree up front.

After `REPO.md`, read only documentation relevant to the task. `REPO.md` should point
to the canonical documents for major areas.

Current documentation describes the supported state. Keep history in `CHANGELOG.md`
and Git history rather than accumulating historical implementation notes in current docs.

Keep future work in Issues, ADRs, `.plan`, or repository-specific future documentation.

Documentation is normally written in Russian. Preserve code identifiers, API names,
configuration keys, function names, protocol terms, and other technical identifiers in
their original English form.

## Language

Use English for:

* `AGENTS.md`, `REPO.md`, and assistant bootstrap files;
* source code and identifiers;
* code comments and godoc/docstrings;
* API identifiers and machine-readable errors;
* Git commit subjects and bodies.

Project documentation under `docs/`, plans, and task descriptions may be written in
Russian unless a repository-specific rule says otherwise.

Do not translate established code or API identifiers inside Russian documentation.

## REPO.md

`REPO.md` is the compact operational context for one repository.

It should let an assistant quickly determine:

* repository purpose and boundaries;
* stack and required toolchain versions;
* important entry points and high-level data flow;
* development, build, test, migration, and generation commands;
* commands or environments that require explicit user approval;
* repository-wide conventions;
* critical cross-cutting invariants;
* locations of canonical domain and engineering documentation.

### What Belongs in REPO.md

Add information when it is:

* relevant to many tasks in the repository;
* useful before code changes begin;
* needed to select the correct entry point, command, or existing abstraction;
* important for preventing a recurring or high-impact mistake;
* a stable description of the current repository.

Prefer a short invariant plus a documentation link over duplicating a detailed contract.

Example:

```text
Runtime model selection must use the shared policy resolver.
See docs/engineering/llm-runtime.md.
```

### What Does Not Belong in REPO.md

Do not use `REPO.md` as a:

* changelog;
* roadmap or backlog;
* ADR;
* risk register;
* task journal;
* stage-by-stage implementation history;
* review findings archive;
* catalogue of every endpoint, handler, function, table, or migration;
* duplicate of detailed `docs/` content.

If information matters only for one domain, keep it in that domain's canonical
documentation and link to it from `REPO.md` when useful.

### Maintaining REPO.md

Update `REPO.md` when a change affects repository-wide context, including:

* stack or required toolchain;
* major entry points;
* module or process architecture;
* build, run, test, migration, or generation workflow;
* required or forbidden commands;
* generated-artifact workflow;
* repository boundaries;
* shared infrastructure;
* cross-cutting runtime invariants;
* process/service topology;
* canonical documentation locations.

Do not update `REPO.md` for every implementation change.

A new handler, helper, endpoint, migration, or internal workflow does not by itself
justify a `REPO.md` change unless it changes how assistants should work with the
repository as a whole.

Keep `REPO.md` current:

* describe confirmed current behaviour only;
* mark partial or future behaviour explicitly;
* remove obsolete rules when the supported mechanism changes;
* do not preserve historical versions of a rule beside the current one;
* verify commands before documenting them;
* keep documentation links valid after moves;
* keep the file compact enough to read completely before every task.

If a section starts describing one domain in implementation-level detail, move that
detail to `docs/` and keep only the invariant and link in `REPO.md`.

## Encoding and Files

* Read and write text as UTF-8.
* Preserve existing line endings and BOM state.
* After editing files containing non-ASCII text, read them back and verify that the content is intact.
* In Python, always specify `encoding="utf-8"` when writing text.
* On Windows PowerShell 5.1, do not write files using `>`, `>>`, implicit `Out-File`, or `Set-Content` without explicit UTF-8 handling.
* Do not manually edit generated artifacts unless `REPO.md` explicitly permits it.

## Change Documentation

After a meaningful change to code, behaviour, configuration, or a public contract:

1. Update the current `## YYYY-MM-DD` block in `CHANGELOG.md`.
2. Keep one changelog block per date.
3. Use short user-visible entries; avoid internal implementation details.
4. Update relevant current documentation.
5. Update `REPO.md` only when the change affects repository-wide context as defined above.

Do not add internal function names, private field names, or low-level implementation
details to the changelog unless they are part of a user/operator-visible contract.

## Planning

`.plan` represents an active workstream or epic.

`.todo` contains atomic tasks for one or more plan stages and may also be based directly
on one or more GitHub Issues when a separate plan is unnecessary.

Long-term, deferred, and cross-repository work belongs in GitHub Issues.

Before creating or updating planning artifacts:

* check existing `.plan`, `.todo`, and open Issues for duplicates;
* preserve unfinished work instead of silently dropping it;
* keep planning artifacts aligned with their source Issues and current implementation status.

Use the dedicated skills for file creation and structure:

* use `plan-create` when creating a new `.plan`; it defines the required `.plan` format and rules;
* use `stage-decompose` when decomposing one or more plan stages into `.todo`; it defines the required `.todo` format and decomposition rules.

Do not infer the canonical `.plan` or `.todo` format from existing files when the
corresponding skill is available.

### GitHub Issues

GitHub Issues are the source of product scope and the shared unit of work tracking.

When creating or updating an Issue:

1. Check open Issues for duplicates.
2. Retrieve available Issue Types and assign the appropriate real `Type`.
3. Retrieve organization Issue Fields applicable to that Type.
4. Set all applicable fields; at minimum set `Priority` and `Effort` when known.
5. Do not encode `Type`, `Priority`, `Effort`, or equivalent fields in labels, title prefixes, or body text instead of setting the actual fields.
6. Do not invent `Horizon`, start date, or target date; set them only when explicitly decided.
7. Set fields through the Issue Field Values REST API and verify the resulting values.
8. Use the body for context, scope, acceptance criteria, risks, dependencies, and out-of-scope notes. Use labels only for orthogonal categorization.

Use GitHub REST through `gh api` for GitHub operations.

### `.plan`, `.todo`, and Issues

* A `.todo` derived from `.plan` must retain the relationship to its source stage and covered Issues.
* A `.todo` derived directly from Issues must retain the relationship to all source Issues.
* One `.todo` task may cover only part of an Issue.
* Do not consider an Issue complete until all related tasks are complete and verified.
* Do not mark a plan stage complete until all corresponding `.todo` work is complete and verified.
* When `.todo` is Issue-driven, close completed Issues before marking the related plan or stage complete.
* Never delete unfinished work from `.todo`; carry it forward or keep it explicitly blocked.


## Implementation and Verification

* Follow existing repository style and local helper APIs.
* Prefer an existing abstraction or pattern over creating a parallel mechanism.
* Keep changes narrow and task-focused.
* Update tests and documentation together with behaviour changes.
* Before finishing, run the narrowest relevant formatter, linter, type checker, and tests.
* Follow additional restrictions in `REPO.md`, especially around integration tests, Docker, migrations, production-like operations, secrets, release procedures, and generated files.
* Do not claim successful completion when a required verification was not run. State what was not verified, why, and the remaining risk.

## Git Commits

Commit subjects and bodies must be in English.

Use Conventional Commits:

```text
<type>(<optional scope>): <description>
```

Common types:

* `feat`
* `fix`
* `docs`
* `refactor`
* `test`
* `build`
* `ci`
* `chore`
* `perf`
* `style`

Write the subject as a concise imperative statement without a trailing period.

Add a body when motivation, migration impact, risk, constraints, or non-obvious behaviour
would otherwise be unclear.

For incompatible changes, use `!` after type/scope and include:

```text
BREAKING CHANGE: <description>
```

## Implementation branches and commits

Implementation work must not be committed directly to the repository default branch.

A `.todo` implementation cycle uses one dedicated work branch.

Before starting automated implementation:

1. resolve the repository default branch;
2. ensure the working tree is clean;
3. switch to or create a dedicated work branch for the selected `.todo`.

If the current branch is the default branch and the working tree is clean, an
orchestrating implementation skill may create a work branch using the repository naming
convention. If no repository convention exists, use `todo/<short-slug>`.

If the working tree contains unrelated changes, do not automatically switch branches or
create commits.

## Local planning artifacts

`.plan` and `.todo` are local orchestration artifacts.

They are intentionally ignored by Git and MUST NOT be tracked or committed.

Rules:

- never stage or commit `.plan` or `.todo`;
- never use `git add -f` for these files;
- status/progress changes in `.todo` remain local;
- progress changes in `.plan` remain local;
- implementation, fix, documentation and lifecycle commits MUST exclude `.plan` and `.todo`;
- do not create commits whose only purpose is recording planning/task state;
- before every automated commit, inspect staged files and ensure `.plan` and `.todo` are absent.

Skills may freely read and update these files locally when required by the workflow.

### Task commits

Each successfully implemented `.todo` task should produce its own atomic commit.

The commit includes all changes required for that task as one coherent deliverable:

* implementation;
* tests;
* required migrations or generated artifacts;
* task-specific documentation;
* the task status transition to `review`.

Do not combine multiple independent `.todo` tasks into one commit.

A task that remains `active` or `blocked` must not be committed as completed work by the
automated implementation flow.

Use Conventional Commits and keep the subject focused on the implemented behavior.

When useful for traceability, reference the exact `.todo` task and source Issue in the
commit body.

### Review fixes

Review fixes remain on the same work branch.

Prefer one focused fix commit per affected task and review cycle rather than one large
commit containing unrelated fixes.

Multiple findings with the same root cause or belonging to the same task may be fixed in
one commit.

Standalone `fix-it` does not need to create a commit itself. `fix-all` or the surrounding
workflow may group completed fixes by task and commit them atomically.

### Closing

`todo-close` creates a final metadata-only commit for lifecycle state changes.

It must not squash or rewrite implementation commits.

### Merge boundary

Agents must not automatically merge the work branch into the default branch.

Merge, squash/rebase policy, push approval, and branch deletion remain operator actions
unless explicitly requested otherwise.
