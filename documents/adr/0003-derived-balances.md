# ADR-0003: Balances derived from transactions

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decisions:** D-11

## Context

In v1 `Asset.balance` is stored and updated only by deltas (`increment`). A daily `AssetHistory` snapshot is written on the day the change is *made*, not on the transaction's date, so the "history" is not a history: importing a March statement in October changes today's snapshot, and March stays as it was. `recalculate` double-counts transactions written on the same day as its anchor snapshot, and ignores transactions dated before the account was created. There is no explicit starting balance.

**Example used below.** An account opened in the system on 1 March with 1,000. On 10 October the March transactions are imported: −800 (rent, 05/03) and +2,000 (salary, 27/03).

Investments and property do not have a transaction for every price change, so a value model is needed for them too.

## Decision

**The balance is always derived from the transactions** (the Actual Budget model, [ADR-0002](0002-actual-budget-reference-model.md)):

- The opening balance is a **starting balance** transaction (1,000 on 01/03).
- The balance at any date is the sum of the transactions up to that date; the history is the cumulative sum by date, computed by the database. In the example, the balance at 31/03 is 1,000 − 800 + 2,000 = **2,200**, whatever day the March transactions were imported.
- The value of investments and other assets changes through **adjustment** transactions (for example "Revaluation +350").
- `AssetHistory` is removed, or reduced to a view.
- A cached balance is added **only if a performance problem is measured**, and then only as a cache with a consistency check, never as a second source of truth.

## Alternatives considered

- **Stored balance updated by deltas, with snapshots on the transaction's date.** Each delta updates the snapshot of the transaction's day and every later one. Rejected: writes are expensive and fragile (a single back-dated transaction touches about 220 snapshot rows) and there are two sources of truth that can diverge, which is the v1 problem.
- **Derived as the truth, plus a cached `balance` updated by deltas from the start**, with a reconciliation check between cache and sum. Not adopted up front: it keeps part of the delta complexity for a speed-up nobody has measured. It stays available if measurements call for it.

## Consequences

- One source of truth: back-dated imports, edits and deletions are correct automatically, and the Net Worth history is correct for free.
- Reconcile becomes simple: compare the derived balance with the bank's and record the difference as an adjustment. `POST /assets/:id/recalculate` becomes reconciliation.
- Balances are computed on read; with an `(account, date)` index and the volumes of one person this costs milliseconds.
- The delta logic and `AssetHistory` go away, with the work built on them in v1 (issue #60, commit `28fd8ee`). The v1 bug where an update or delete reads the old row outside the database transaction and can apply a delta twice disappears with the deltas; issue #91 checks the balance under concurrent edits.
- New transaction kinds are needed to tell starting balances and adjustments apart from income and spending ([ADR-0008](0008-transaction-kind.md)).
- Savings goal progress follows the same principle: computed, never stored (D-26).
