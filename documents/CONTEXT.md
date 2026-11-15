# Domain glossary

The words this project uses for its domain. Actual Budget is the reference model ([ADR-0002](adr/0002-actual-budget-reference-model.md)), so a term takes Actual's name and meaning wherever they match; differences are stated.

The **v1 code** column gives the name used in the code at `v1.0.0`, where one exists. The v2 models take the names in the Term column, which are Actual Budget's (D-60); their fields are in [`domain/data-model.md`](domain/data-model.md).

| Term | Meaning | Actual Budget | v1 code |
| --- | --- | --- | --- |
| Account | Anything that holds money or value: checking and savings accounts, cards, cash, investments, property, debts. Its balance is derived from its transactions (D-11). | Account | `Asset` |
| On-budget account | An account whose transactions count as income and spending and feed the budget. | On budget | `Asset.isOnBudget = true` |
| Off-budget account | An account tracked only for Net Worth, such as an investment account or a mortgage (D-07). | Off budget | `Asset.isOnBudget = false` |
| Closed account | An account that keeps its history but accepts no new transaction; only the category, payee and notes of its transactions can change. Closing moves any remaining balance to another account with a transfer; a closed account can be reopened (D-63, D-81, D-115). | Closed account | — |
| Transaction | A dated movement of money on one account. Has a `kind`, a calendar date, an optional local time, an amount, an optional payee and an optional category. | Transaction | `EnrichedTransaction` |
| Raw transaction | A bank row as read from the import file, before mapping. v1 only: the v2 import keeps rows in the preview and writes no staging data (D-06). | — | `RawTransaction` |
| Transaction kind | What a transaction is: `REGULAR`, `TRANSFER`, `STARTING_BALANCE` or `ADJUSTMENT` (D-25, [ADR-0008](adr/0008-transaction-kind.md)). It decides what counts in the analytics. | — (Actual infers it) | `isTransfer` was planned, never built |
| Starting balance | The transaction that opens an account with its initial balance, dated on the opening day (D-11). | Starting Balance | Implicit in `Asset.balance` at creation |
| Adjustment | A transaction that changes an account's value without a real movement: a reconciliation difference or a revaluation of an investment (D-07, D-11). | Reconciliation adjustment | — |
| Reconcile | Comparing an account's derived balance with the bank's and recording the difference as an adjustment (D-12). | Reconcile | `POST /assets/:id/recalculate` |
| Transfer | Money moved between two own accounts: a linked pair of transactions with opposite amounts. When one side is created, the other is generated; importing the other account later matches the generated side instead of duplicating it (D-24). | Transfer | — |
| Payee | The clean name of who was paid or who paid, such as "Esselunga". It can carry a default category (D-12, D-22). | Payee | — |
| Imported payee | The payee text as it comes from the bank, cleaned deterministically (prefixes, card numbers and dates removed) before rules rename it (D-22). | Imported payee | `details` |
| Rule | Conditions (all, or at least one) and actions (set payee, category, notes, or mark as a transfer). Rules run in the user's order; for each field the first rule that sets it wins (D-23). | Rule (Actual has pre, default and post stages instead) | — |
| Category group | A container of categories, such as "Home". Holds no transactions or budget amounts (D-27). | Category group | Parent `Category` |
| Category | Where a transaction or a budget amount is classified, such as "Home › Utilities". Exactly two levels: group and category (D-27). | Category | Child `Category` |
| Income group | A category group whose categories hold income (`CategoryGroup.isIncome`). Income is read from the categories of income groups, not from the sign of the amounts; a user can have several, and none is protected (D-74). | Income group (exactly one) | — |
| Uncategorized | A transaction without a category: the category is empty, not a special category (D-28). Every transaction of an off-budget account, and every transfer that does not cross the on/off-budget boundary (on ↔ on, off ↔ off), is always uncategorized (D-25, D-96). When it counts, an uncategorized transaction is spending if negative and income if positive (D-97). | Uncategorized | `UNCATEGORIZED` system category |
| Monthly budget | An amount planned for a category in a given month; spending is tracked against it, with no assignment of income and no rollover. An amount can be set as a percentage of the previous month's income (D-09, D-17, [ADR-0006](adr/0006-monthly-tracking-budget.md)). | Tracking budget | `BudgetRule` (one amount per category for every month) |
| Savings goal | A target amount. Progress is always computed; in the MVP it is the balance of a dedicated account. Reaching the target is computed; only "archived" and "paused" are set by hand (D-26). | — (Actual has goal templates on budget amounts) | `SavingsGoal` with a stored `currentAmount` |
| Target date | The optional date by which a savings goal should be reached; it gives the amount needed each month (D-109). | The `by` date of a goal template | `SavingsGoal.deadline` |
| Overdue | A savings goal whose target date has passed without the target being reached. Computed, like "reached", never set by hand (D-109). | — | — |
| Import template | A named, reusable mapping of a bank file: start row, columns, date format, sign convention, category values. Each account can have a default template (D-15, D-43). | CSV import settings, per account | — |
| Import preview | The stateless review of an import before anything is saved: every row shows its category and where it came from, duplicates and suggested transfers; the server re-validates everything on confirm (D-06, [ADR-0004](adr/0004-stateless-import-staging.md)). | Import preview | — |
| Duplicate | An imported row that matches an existing transaction by bank ID, by exact hash, or approximately (same account and amount, date within a few days). Always shown in the preview, never dropped silently (D-16, [ADR-0007](adr/0007-layered-deduplication.md)). | Duplicate detection | `transactionHash` |
| Already imported | A duplicate found by bank ID or by exact hash: shown in the preview, linked to the transaction it matches, and never imported again (D-87). | — | — |
| Possible duplicate | A duplicate found by the approximate match: the user merges it with the transaction it matches (the default), imports it as new, or discards it (D-87). | — | — |
| Net Worth | The sum of all account balances, on-budget and off-budget, at a date, in EUR (D-07). Counts every transaction kind. | Net worth | `AssetHistory` snapshots |
| Calendar date | A transaction's date as the bank gives it, without a time zone; months and days are computed on it. The user's time zone (default Europe/Rome) only decides what "today" is and the date of transactions created by the app (D-30). | Date | `DateTime` |
| Science service | The Python service that computes forecasts, goal projections and, later, suggestions. Optional: the core keeps working without it (D-14, [ADR-0005](adr/0005-python-science-service-rest.md)). | — | `backend-science` |
| `ScienceClient` | The interface the core uses to call the science service; it hides the transport (REST today, NATS later) and handles timeouts, retries and a circuit breaker (D-21). | — | `ScienceService` (HTTP proxy) |
