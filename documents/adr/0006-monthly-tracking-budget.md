# ADR-0006: Monthly tracking budget per category

- **Status:** Accepted
- **Date:** 2026-10-09 (model chosen 2026-10-08)
- **Decisions:** D-09, D-17

## Context

In v1 `BudgetRule` is one-to-one with a category: a single value valid for every month, either `FIXED_AMOUNT` or `PERCENTAGE_OF_INCOME`.

Two questions were open. **Which budgeting model?** In October 2,500 comes in; groceries are planned at 400 and 450 is spent:

- **Envelope (zero-based, Actual's classic model):** at the start of the month the 2,500 are assigned to categories until "To Budget" is 0; groceries go to −50 and must be covered from another category; leftovers roll over.
- **Tracking (Actual's other mode, close to v1):** groceries have 400 for the month; the month ends at 450/400 = 112%, with an alert; the next month starts from zero, without assigning income and without rollover.

**One amount, or one per month?** "Gifts" is 50 a month all year but 400 in December; "Holidays" is 0 except 1,500 in August. A single cap cannot represent either.

## Decision

- **Tracking budget** as the first model (D-09). Envelope budgeting may come later, as its own ADR; the data model must not rule it out.
- **Amounts per category per month** (D-17): a table of (category, month, amount), with convenience commands such as "copy the previous month", "set for the whole year", "average of the last three months".
- **A percentage of income is kept**, computed on the **previous month's** income, which is known when the month starts.
- Budget amounts belong to categories, never to category groups (D-27).

## Alternatives considered

Model (D-09):

- **Envelope only.** Rejected for now: a new data model (monthly assignments, rollover, "To Budget") and monthly discipline for the user, while envelope budgeting is not what sets this project apart.
- **Both, chosen by the user.** Deferred, not rejected: it is the intended later direction (D-09), once tracking works. Not now because two models mean double code and double tests.

Amounts (D-17):

- **One cap per category (v1).** Rejected: cannot represent December or August, and blocks envelope budgeting later.
- **A default cap plus monthly overrides.** Rejected: two concepts to explain (default and override) for what per-month amounts already cover with convenience commands.

## Consequences

- `BudgetRule` (one-to-one) is replaced by monthly budget amounts.
- More rows and a months × categories grid in the client.
- Per-month amounts are the base envelope budgeting needs: adding it later means adding rollover and "To Budget", not a new model.
- `PERCENTAGE_OF_INCOME` survives with a defined meaning (previous month's income).
- Deleting a category deletes its budget amounts, with a warning in the deletion preview (D-29).
