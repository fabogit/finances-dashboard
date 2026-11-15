# ADR-0008: Transaction `kind`

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decisions:** D-25; amended by D-96 and D-97 (2026-11-12)

## Context

With derived balances ([ADR-0003](0003-derived-balances.md)) some transactions are neither spending nor income: starting balances, reconciliation and revaluation adjustments, transfers. In v1 "Transfers", "Investments" and "Withdrawals" count as spending or income and inflate every analytics figure; `isOnBudget` is never read.

The previous specs also contradicted each other: one plan excluded every transfer from the analytics, while the design spec made on-budget → off-budget and off-budget → on-budget transfers real spending and income, which a blanket filter would remove.

**Example.** October: salary +2,500; expenses −1,800; transfer from checking to a savings account, both on-budget, −500/+500; transfer to the off-budget investment account −300; ETF revaluation +350; a new card account opened with a starting balance of +200.

- v1 analytics: income 2,500 + 500 + 350 + 200 = 3,550; spending 1,800 + 500 + 300 = 2,600.
- Correct: income **2,500**; spending 1,800 + 300 = **2,100**, because the 300 leaves the budget. The on-budget transfer, the revaluation and the starting balance count only towards Net Worth.

## Decision

Every transaction has a **`kind`**: `REGULAR`, `TRANSFER`, `STARTING_BALANCE` or `ADJUSTMENT`. The kinds are mutually exclusive.

- **Income and spending analytics** count `REGULAR` transactions (of on-budget accounts, see [Amendments](#amendments)) plus the `TRANSFER` transactions that **cross the on-budget / off-budget boundary**: those carry a category, and on → off counts as spending, off → on as income.
- Transfers that do not cross the boundary do not count. Between two on-budget accounts they have no category (D-28).
- **Net Worth** counts every transaction, whatever its kind.
- The rule is written once, in the analytics flow document, and applied in the database queries (issue #95). The forecast input is filtered by the same rule (D-35).

## Alternatives considered

- **Boolean flags** such as `isTransfer` and `isAdjustment`. Rejected: they allow impossible combinations (`isTransfer` and `isAdjustment` together) and tend to multiply over time.
- **Special system categories** such as "Transfer" or "Starting balance", excluded from the analytics. Rejected: they mix *what a transaction is* with *how it is classified*, and bring back the ambiguity of v1's special system category for uncategorised transactions, which D-28 removed: uncategorised is an empty category.

## Consequences

- Replaces the planned `isTransfer` flag and ends the contradiction between the old specs on how transfers count.
- The analytics rule must be defined for every pair of kind and on/off-budget accounts; the flow document lists them with examples.
- Starting balances and adjustments never distort income and spending, yet still move balances and Net Worth.
- Issue #74 builds transactions with `kind` and transfers; issue #95 applies the rule in the database.

## Amendments

Two decisions taken while writing the v2 specs (#104) narrow the rule above; the full rule, with examples, is in the [analytics flow](../flows/analytics.md#what-counts).

- **D-96 · `REGULAR` transactions of off-budget accounts stay out of income and spending.** They count only towards Net Worth and carry no category, as in Actual Budget: a category sits only on a `REGULAR` transaction of an on-budget account or on the on-budget side of a transfer that crosses the boundary. A dividend that must count as income reaches the checking account through a categorised off → on transfer. Rejected: counting them when they have a category, which would make income swing with investment returns.
- **D-97 · Uncategorised transactions count by sign.** A transaction that counts and has no category is spending when negative and income when positive, under a separate "Uncategorized" line on both sides (D-28); for a transfer that crosses the boundary the direction decides, as above. This is Actual's Cash Flow report. Rejected: all of them as spending with their sign (Actual's Spending report), or left out of the totals.
