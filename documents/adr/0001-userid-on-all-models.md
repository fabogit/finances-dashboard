# ADR-0001: `userId` on all models

- **Status:** Accepted
- **Date:** 2026-07-11 (timing 2026-10-09, enforcement 2026-10-15)
- **Decisions:** D-18, D-48; first taken before the v2 design review, in a stabilization session of 2026-07-11

## Context

The project is meant to grow from a personal tool with a portfolio demo into a real multi-user product (D-02). Every query must then be scoped to the user it runs for, or one user's data leaks to another.

When this was first decided, only some models carried `userId`; the others could reach their owner only through a chain of relations (a balance snapshot through its account, a budget through its category, a transaction through its account). What v1 has today is described in [architecture § Multi-tenancy](../architecture/overview.md#multi-tenancy).

The planned enforcement is a Prisma client extension that adds `where: { userId }` to every query transparently, reading the user from the request context (`nestjs-cls`). Such an extension needs one uniform field to filter on.

## Decision

**Every model carries its own `userId`**, including models where the owner could be inferred through a relation.

- **Why uniform:** the extension can scope every model the same way, with no per-model join paths to configure and forget when a model is added; filtering on a column of the table itself avoids multi-table joins and lets every table have `(userId, …)` composite indexes; each row carries its owner even if a relation chain changes later (defence in depth).
- **When (D-18):** in the Schema v2 rewrite (#89), with unique constraints and indexes scoped per user, not later with authentication.
- **Enforcement (D-48):** built in M2, before authentication. A middleware puts a fixed, configured user into the request context; the Prisma extension adds `where: { userId }` to every query and sets `userId` on every create; raw SQL, which extensions do not see, reads the user from the context and filters on it explicitly. When authentication arrives (#62, #63), a JWT guard replaces the middleware and the repositories do not change.
- Whether `userId` references a `User` table is decided by the v2 data model (#104).

## Alternatives considered

- **Join-based filtering:** the extension traverses relations, with a different `where` per model (a transaction through its account, a budget through its category). Rejected: per-model configuration is error-prone, every new model needs its own join path, joins are slower than a direct column, and a mistake in a join path is a data leak.
- **`userId` only on root models** (the ones queried directly), not on child models. Rejected: two classes of models with different isolation strategies, conditional logic in the extension again, and child models such as budgets turn out to be queried directly too.
- **A column default with no filtering until authentication** (D-48). Rejected: isolation would never be exercised before the post-MVP, and every query would need checking when authentication arrives.
- **An explicit `where: { userId }` in every repository** (D-48). Rejected: it duplicates what the extension does and is easy to forget once.

## Consequences

- One pattern for every model: simpler indexes, rows that show their owner, no special cases in the extension.
- Every create must set `userId`; the extension does it from the request context.
- About 36 bytes more per row, negligible at the volumes of personal finance.
- A redundant column on models whose owner could be inferred, accepted as the cost of uniformity.
- Unique constraints are reviewed one by one: some include `userId`, others are already scoped by a parent that belongs to one user (for example, uniqueness per account).
- Part of the post-MVP tenancy work (#63: request context and extension, without JWT) moves into M2.
- Procedure for agents: [`.agents/workflows/multi-tenancy-flow.md`](../../.agents/workflows/multi-tenancy-flow.md). Authentication, roles and the demo sandbox: post-MVP milestone "Auth & multi-tenancy" (#62–#65).
