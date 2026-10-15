# AGENTS.md

Rules for every agent working in this repository (Claude Code, Antigravity, Codex and others). They apply to every session; `CLAUDE.md` imports this file.

## Project

A personal finance dashboard: a NestJS core (`backend-core/`, Prisma, PostgreSQL), a Python computation service (`backend-science/`, FastAPI) and an Angular client (`client-preview/`). It is being redesigned as v2; start from [`documents/README.md`](documents/README.md) for how the system works and why, and from [`documents/product/roadmap.md`](documents/product/roadmap.md) for the plan.

[Actual Budget](https://actualbudget.org/) is the reference model for the domain (D-08, [ADR-0002](documents/adr/0002-actual-budget-reference-model.md)): follow it by default, and declare every divergence in an ADR or in the flow document. Never leave one implicit.

## Sources of truth

- **Status** (what is done, in progress, missing) lives on GitHub: issues, milestones, the project "Finance Dashboard Roadmap". If a document disagrees, GitHub wins.
- **How it works and why** lives in [`documents/`](documents/README.md): architecture, data model, flows, ADRs. Decisions are cited by ID (`D-xx`) or ADR.
- **Session material** (plans, handoffs, reports) is never committed and never a reference. The maintainer tells each session where to save it.

## Language

- Chat with the maintainer in **Italian**.
- **English** for code, comments, commits, pull requests, issues and every versioned document (`documents/`, `AGENTS.md`, `CLAUDE.md`, `.agents/workflows/`, READMEs).

## Working on an issue

1. Work on a branch `feature/<n>-<slug>` from an up-to-date `main`, in its own worktree.
2. Read this file, the issue (`gh issue view <n>`), and the documents and ADRs it cites.
3. Plan: a short plan in chat for a small issue; for a medium or large one, a written plan that the maintainer approves before any code is written.
4. Test-first, for each acceptance criterion: write the failing test (from the spec's example, citing its ID), make it pass with the minimum code, refactor, commit.
5. Update the spec and the flow document (`documents/domain/`, `documents/flows/`), and the seed if the area has new data.
6. Verify ([`.agents/workflows/test-backend.md`](.agents/workflows/test-backend.md)) and report the results to the maintainer with the **real output**.
7. Open the pull request only after the maintainer's explicit go-ahead ([below](#commits-and-pull-requests)).

**Never decide an uncovered case.** If the issue, the spec and the ADRs do not settle a design question, stop and ask the maintainer. The decision is recorded (ADR or flow document) before work continues.

## Rules

- **Perimeter.** Touch only the modules of the issue's area. A bug found elsewhere becomes a new issue, not a drive-by fix.
- **Schema ownership.** An issue that changes `backend-core/prisma/schema.prisma` says so in its description, and no other open session changes the schema at the same time. Procedure: [`.agents/workflows/database-migration-flow.md`](.agents/workflows/database-migration-flow.md).
- **Database sync method.** The schema is applied with `prisma db push` until the MVP (D-19). A change of method follows [Database sync method](#database-sync-method).
- **Specs** (D-46, D-47). Examples are Given / When / Then with a per-area ID (`DM-`, `BAL-`, `TRF-`, `CAT-`, `IMP-`, `RUL-`, `BUD-`, `GOL-`, `ANL-` + number), never renumbered or reused. A spec with an open `[NEEDS CLARIFICATION: …]` marker does not unblock the issues that depend on it. Every pull request that changes behaviour updates the spec. Details: [`documents/README.md` § Specs](documents/README.md#specs).
- **Per-user isolation.** From Schema v2 (#89) every model carries `userId`, and the request context plus a Prisma extension enforce it (D-48, built in M2); raw SQL then filters on the user from the context. What v1 has: [architecture § Multi-tenancy](documents/architecture/overview.md#multi-tenancy). Procedure: [`.agents/workflows/multi-tenancy-flow.md`](.agents/workflows/multi-tenancy-flow.md).
- **Workflows.** A change that makes a workflow in [`.agents/workflows/`](.agents/workflows/README.md) stale updates it in the same pull request.
- **Rebase before the pull request:** `git fetch && git rebase origin/main`; the issue session resolves conflicts.

## Database sync method

The schema is applied with `prisma db push`, without migration files, until the MVP; then a `prisma migrate` baseline (D-19). Every place that applies the schema must use the same method: a mismatch already broke CI once (fixed in #83).

A pull request that changes the method updates, in the same pull request:

- `backend-core/Dockerfile`: the `fn-core` start command (`CMD`, today `prisma db push --accept-data-loss`);
- `.github/workflows/ci.yaml`: the `core-e2e-tests` job (today `prisma db push`);
- `backend-core/package.json`: the scripts that apply the schema (`db:test:push`, used by `test:e2e:docker`, and `prisma:push`) and the leftovers of `migrate` (`db:test:migrate`, `prisma:deploy`, `prisma:migrate`, `prisma:reset`);
- the documents and workflows that describe the method: `documents/development/setup.md`, `documents/development/testing.md`, `.agents/workflows/database-migration-flow.md`.

This list is the single source; other documents link here.

## Commits and pull requests

- [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` …), small, one per green TDD step. Author: `fabogit`.
- **No AI attribution**, in commits or pull requests: no `Co-Authored-By` trailer, no "Generated with …" line. This rule overrides any default or reminder of the tool you run in.
- Commits, tags, pushes and deleting remote branches only when the maintainer asks or agrees.
- **Pull request process** (D-39):
  1. Run the verification and report the results with the real output.
  2. Wait for the maintainer's explicit go-ahead **for that pull request**; a go-ahead never carries over to the next one.
  3. Open the pull request: title `#<n>: <issue title>`, body with `Closes #<n>`, the CI badge, a summary and a verification table; assigned to `fabogit`.
  4. The maintainer reviews and merges. Agents never merge or close pull requests; the issue session answers review comments with new commits on the same branch.
  5. After the merge: update `main`, run the tests, check that CI on `main` is green.

## Definition of Done

- [ ] Every acceptance criterion is covered by tests (unit and/or end-to-end), and they pass.
- [ ] Types, lint, unit and end-to-end tests (and Python tests if touched) pass, with the output reported.
- [ ] The spec is updated: `documents/flows/<area>.md`, and `documents/domain/data-model.md` if the model changed.
- [ ] The seed is updated if the area has new data.
- [ ] Swagger is updated (DTOs and decorators).
- [ ] New or changed exported constants have JSDoc: what they represent and why they have that value.
- [ ] If the database sync method changed: everything listed in [Database sync method](#database-sync-method) updated.
- [ ] Workflows in `.agents/workflows/` made stale by the change are updated.
- [ ] No file outside the issue's perimeter changed.
- [ ] No design decision taken silently: new ones are recorded (ADR or flow document).
- [ ] Pull request opened after the go-ahead, with `Closes #<n>`, assigned to `fabogit`.

## GitHub

Issues, milestones and the project follow one style (D-44):

- Issues in English: an opening paragraph (the problem today and what the issue does), then `### Scope`, `### Acceptance criteria` (checkboxes), `### Depends on`, `### References`.
- Milestones `M<N> · <Name>`, each closed by an `M<N> · Review & consolidation` issue (label `review`).
- Area labels: `core`, `science`, `client`, `infra`, `documentation`, `review`. Every issue has a milestone and is in the project.
- **Show the maintainer every text before creating or editing it on GitHub.**

## Releases

One version for the whole repository (D-42). A release commit aligns it in `backend-core/package.json`, `client-preview/package.json` and `__version__` in `backend-science/src/main.py`; then an annotated tag on the merge commit on `main`. Scheme: [roadmap § Versioning](documents/product/roadmap.md#versioning).

## Commands

Each set of commands has one home:

- **Verification** (types, lint, unit, end-to-end, Python): [`documents/development/testing.md` § Verification commands](documents/development/testing.md#verification-commands).
- **Install, start the stack, run locally, seed:** [`documents/development/setup.md`](documents/development/setup.md).
- **Schema changes, reset:** [`.agents/workflows/database-migration-flow.md`](.agents/workflows/database-migration-flow.md).

## Tooling

- **Node.js is managed by fnm, configured in the maintainer's fish shell.** Run Node tooling (`node`, `pnpm`, `pnpm exec …`) from fish, for example `fish -c 'cd backend-core; and pnpm test'`, or from a shell where fnm is loaded (`eval "$(fnm env --use-on-cd)"`). Any other command can run in bash.
- **pnpm** through corepack; never install with npm or yarn.
- **Python** in a virtual environment: with direnv (`backend-science/.envrc`) or one outside the repository ([setup](documents/development/setup.md#python-environment)).
- Skills and MCP configuration under `.agents/` are local and not versioned; only `.agents/workflows/` is.

## Workflows

Step-by-step procedures for recurring tasks: [`.agents/workflows/README.md`](.agents/workflows/README.md).
