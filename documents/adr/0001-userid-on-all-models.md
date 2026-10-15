# ADR-0001: Denormalize userId on All Models

**Status:** Accepted
**Date:** 2026-07-11
**Decision Makers:** @fabogit
**Context Session:** stabilization session of 2026-07-11, decision D1 (session notes, not versioned)

---

## Context

The Finance Dashboard is migrating from a single-user system to multi-tenancy (Phase C, Issues [#62](https://github.com/fabogit/finances-dashboard/issues/62), [#63](https://github.com/fabogit/finances-dashboard/issues/63)). Every query must be scoped to the authenticated user to prevent data leakage.

The current schema has `userId` only on `Category` (added in Step A1, commit `417daf7`). Other models — `BudgetRule`, `AssetHistory`, `EnrichedTransaction`, `RawTransaction`, `Asset`, `SavingsGoal` — do not carry `userId` directly.

The Prisma Client Extension planned for Phase C2 will inject `where: { userId }` on all queries transparently via `nestjs-cls`. This extension needs a uniform field to filter on.

## Decision

**Add `userId String` to ALL models**, including those where it is technically redundant because the user can be inferred through a relation chain (e.g., `AssetHistory → Asset → userId`).

This means:

- `BudgetRule` gets `userId` (currently inferred via `Category.userId`)
- `AssetHistory` gets `userId` (currently inferred via `Asset.userId`)
- `EnrichedTransaction` gets `userId` (currently inferred via `Asset.userId`)
- `RawTransaction` gets `userId` (currently inferred via `Asset.userId`)

## Rationale

1. **Uniform Prisma Extension**: The Client Extension can apply `where: { userId }` unconditionally to every model without conditional logic per-model or join-based filtering. This eliminates a category of bugs where a new model is added but the extension forgets to handle its specific join path.

2. **Query Performance**: Direct `WHERE userId = ?` on every table avoids multi-table joins for tenant isolation. Every model can have its own composite index including `userId`.

3. **Defense in Depth**: Even if a relation chain breaks (e.g., a future schema migration removes a relation), each record independently carries its tenant identifier. No data leakage through orphaned records.

## Consequences

### Positive

- Zero conditional logic in the Prisma Extension — one pattern for all models
- Simpler index design — every table can have `(userId, ...)` composite indexes
- Easier debugging — every row is self-documenting about ownership
- Future-proof against schema refactoring that changes relation chains

### Negative

- **Storage overhead**: ~36 bytes per row (UUID string) on every record in every table. For a personal finance app, this is negligible (thousands of rows, not millions).
- **Write-time overhead**: Every `create` must include `userId`. Mitigated by the CLS-based extension which injects it automatically.
- **Migration cost**: All existing records need `userId` backfilled. Mitigated by the "Reset & Rewrite" strategy — no migration compatibility constraints.
- **Schema noise**: Redundant field on models where ownership is already inferrable. Accepted as the cost of uniformity.

### Unique Constraint Impact

- `@@unique` constraints that include `userId` must be evaluated case by case. Example: `AssetHistory` uses `@@unique([assetId, date])` — the `userId` does NOT enter this constraint because an asset belongs to exactly one user (decision D2 of the same stabilization session).

## Alternatives Considered

### A. Join-based filtering (Prisma Extension traverses relations)

The extension would apply different `where` clauses per model:

- `EnrichedTransaction`: `where: { asset: { userId } }`
- `BudgetRule`: `where: { category: { userId } }`
- `AssetHistory`: `where: { asset: { userId } }`

**Rejected because:**

- Requires per-model configuration in the extension — error-prone, hard to maintain
- Every new model needs a custom join path
- Join-based filtering is slower than direct field filtering
- A bug in the join configuration is a data leakage vulnerability

### B. Partial denormalization (only on "root" models)

Add `userId` only to models that are direct entry points for queries (e.g., `EnrichedTransaction`, `Asset`) but not to "child" models (e.g., `AssetHistory`, `BudgetRule`).

**Rejected because:**

- Creates two classes of models with different isolation strategies
- The Prisma Extension still needs conditional logic
- `BudgetRule` is queried directly via the standalone API (Issue #75, Step B8) — it IS an entry point

---

## Update 2026-10-09 and 2026-10-15 (v2 design review)

- **When (D-18, 2026-10-09):** `userId` goes on every model in the Schema v2 rewrite ([#89](https://github.com/fabogit/finances-dashboard/issues/89)), not in Phase C, with unique constraints and indexes scoped per user. The product starts as a personal tool with a portfolio demo and grows into a real multi-user product after the MVP (D-02), so the foundations are laid now.
- **The models named above are v1 models.** In v2 `AssetHistory` disappears (balances are derived, [ADR-0003](0003-derived-balances.md)) and `BudgetRule` becomes a monthly budget per category ([ADR-0006](0006-monthly-tracking-budget.md)); the decision applies to whatever models v2 has. The constraint example above is historical.
- **Enforcement before authentication (D-48, 2026-10-15):** the mechanism this ADR assumes is built in M2, without waiting for authentication. A middleware puts a fixed, configured user into the request context (`nestjs-cls`); the Prisma extension adds `where: { userId }` to every query and `userId` to every create; raw SQL reads the user from the context and filters on it explicitly, because extensions do not see raw queries. When authentication arrives (#62, #63), a JWT guard replaces the middleware and the repositories do not change. Rejected: a column default with no filtering (isolation never exercised before the post-MVP), and an explicit filter in every repository (duplicates the extension and is easy to forget once). Whether `userId` references a `User` table is decided by the v2 data model (#104).

## References

- Multi-tenancy procedure for agents: [`.agents/workflows/multi-tenancy-flow.md`](../../.agents/workflows/multi-tenancy-flow.md)
- Post-MVP milestone "Auth & multi-tenancy": issues #62–#65
