---
description: Find in-memory data processing in NestJS services and move it into PostgreSQL through Prisma or parameterised raw SQL.
---

# Delegating work to the database

Aggregations, grouping, filtering and sorting belong in PostgreSQL, not in TypeScript loops. This workflow finds in-memory processing and moves it into the database. It is the procedure behind the analytics rewrite (#95).

All commands run from `backend-core/`. Prerequisites: the stack is running ([start-backend.md](start-backend.md)) and the schema is applied ([database-migration-flow.md](database-migration-flow.md)).

## 1. Find it

Signs that work can move to the database:

1. **Grouping or aggregating in code:** `Map`, `forEach`, `reduce` or `for…of` loops computing sums, counts or averages, for example per month.
2. **Filtering after the query:** `.filter()` on rows the database just returned.
3. **Sorting after the query:** `.sort()` instead of `ORDER BY` on an index.
4. **Date keys built in code:** `toISOString().slice(0, 7)`, `getFullYear()` and the like to group by month.
5. **Money summed as numbers:** `toNumber()` or `parseFloat` before adding amounts. Floating-point sums are wrong for money (v1 analytics do this).

## 2. Choose the tool

| Scenario | Tool | Why |
| --- | --- | --- |
| Simple aggregations on fixed fields (`sum`, `avg`, `count`, `groupBy`) | Prisma Client API | Type-safe, no hand-written SQL |
| Grouping on expressions, such as the month of a date | `$queryRaw` with `date_trunc` or `to_char` | Prisma cannot group on expressions |
| Dynamic filters and complex joins | `$queryRaw` with `Prisma.sql` and `Prisma.join` | Composable `WHERE` clauses that stay parameterised |
| Running totals (balance history) | Window functions (`SUM(...) OVER (ORDER BY date)`) | Derived balances are cumulative sums ([ADR-0003](../../documents/adr/0003-derived-balances.md)) |
| Trees or recursive structures | Common table expressions | Avoids N+1 queries |

## 3. Rules for the query

- **Parameterise everything.** Never build SQL by concatenation or plain template strings; use the `$queryRaw` tagged template or `Prisma.sql`. `$queryRawUnsafe` with user input is forbidden.
- **Filter by user explicitly** (once the D-48 mechanism exists, M2). Raw SQL bypasses the Prisma extension that adds `userId` to ordinary queries, so every raw query reads the user from the request context and filters on it. In v1 there is no context yet ([multi-tenancy-flow.md](multi-tenancy-flow.md) § Today).
- **Group on the calendar date.** Transactions have a calendar `DATE`; group on it directly, without time-zone conversion (D-30). (v1 still has a `DateTime` grouped by UTC month.)
- **Count what the analytics rules say.** Income and spending count `REGULAR` transactions plus transfers that cross the on/off-budget boundary; Net Worth counts everything ([ADR-0008](../../documents/adr/0008-transaction-kind.md); exact rules in `documents/flows/analytics.md` once #104 writes it). Do not invent a filter.
- **Keep money decimal.** `SUM` on `Decimal` columns returns `Prisma.Decimal`; keep it decimal through the service and convert only when serialising the response.
- **Handle empty sets.** `COALESCE(SUM(t."amount"), 0)`; `COUNT(*)::int` to avoid `bigint`.
- **Quote identifiers.** PostgreSQL is case-sensitive with quoted names: `"EnrichedTransaction"`, `"assetId"`.

## 4. Implement

- **Repository:** one method per aggregation (for example `getMonthlyTrends(filters)`), building the query with `Prisma.sql` and `Prisma.join` for optional filters, and returning typed rows.
- **Service:** calls the repository and maps rows to the response DTO; business rules stay here.
- Write the tests first, from the spec's examples (the `ANL-` examples for analytics).

## 5. Verify

1. **Service unit tests** (`*.service.spec.ts`): mock the new repository method; check the mapping, including `Prisma.Decimal` values.
2. **Repository unit tests** (`*.repository.spec.ts`): mock `$queryRaw` and check the parameters for each filter combination.
3. **The full verification** ([test-backend.md](test-backend.md)): end-to-end results must not change unless the issue says they should.

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| `$queryRaw` returns `BigInt` | `COUNT(*)` is `bigint` in PostgreSQL | `COUNT(*)::int`, or `Number()` in the service |
| Table or column not found | Unquoted identifier | Quote it: `"EnrichedTransaction"` |
| `null` instead of 0 | `SUM` over no rows | `COALESCE(SUM(...), 0)` |
| `Prisma.join` fails | Empty array gives `IN ()` | Skip the condition when the list is empty |
| Totals off by cents | Amounts converted to `number` before summing | Sum in SQL, keep `Decimal` until serialisation |
