# ADR-0008: Transaction `kind`

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decisions:** D-25 (design review R3.5)

## Context

With derived balances ([ADR-0003](0003-derived-balances.md)) some transactions are neither spending nor income: starting balances, reconciliation and revaluation adjustments, transfers. In v1 "Transfers", "Investments" and "Withdrawals" count as spending or income and inflate every analytics figure; `isOnBudget` is never read.

The previous specs also contradicted each other (contradiction C3): one plan excluded every transfer from the analytics, while the design spec made on-budget → off-budget and off-budget → on-budget transfers real spending and income, which a blanket filter would remove.

**Example.** October: salary +2,500; expenses −1,800; transfer from checking to a savings account, both on-budget, −500/+500; transfer to the off-budget investment account −300; ETF revaluation +350; a new card account opened with a starting balance of +200.

- v1 analytics: income 2,500 + 500 + 350 + 200 = 3,550; spending 1,800 + 500 + 300 = 2,600.
- Correct: income **2,500**; spending 1,800 + 300 = **2,100**, because the 300 leaves the budget. The on-budget transfer, the revaluation and the starting balance count only towards Net Worth.

## Decision

Every transaction has a **`kind`**: `REGULAR`, `TRANSFER`, `STARTING_BALANCE` or `ADJUSTMENT`. The kinds are mutually exclusive.

- **Income and spending analytics** count `REGULAR` transactions plus the `TRANSFER` transactions that **cross the on-budget / off-budget boundary**: those carry a category, and on → off counts as spending, off → on as income.
- Transfers that do not cross the boundary do not count. Between two on-budget accounts they have no category (D-28).
- **Net Worth** counts every transaction, whatever its kind.
- The rule is written once, in the analytics flow document, and applied in the database queries (issue #95). The forecast input is filtered by the same rule (D-35).

## Alternatives considered

- **(b) Boolean flags** such as `isTransfer` and `isAdjustment`. Rejected: they allow impossible combinations (`isTransfer` and `isAdjustment` together) and tend to multiply over time.
- **(c) Special system categories** such as "Transfer" or "Starting balance", excluded from the analytics. Rejected: they mix *what a transaction is* with *how it is classified*, and bring back the ambiguity of special system categories (contradiction C2, settled by D-28: uncategorised is an empty category).

## Consequences

- Replaces the planned `isTransfer` flag and resolves contradiction C3.
- The analytics rule must be defined for every pair of kind and on/off-budget accounts; the flow document lists them with examples.
- Starting balances and adjustments never distort income and spending, yet still move balances and Net Worth.
- Issue #74 builds transactions with `kind` and transfers; issue #95 applies the rule in the database.
