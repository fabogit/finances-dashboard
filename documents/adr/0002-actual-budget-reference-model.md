# ADR-0002: Actual Budget as the reference model

- **Status:** Accepted
- **Date:** 2026-10-08 (scope and divergences 2026-10-09)
- **Decisions:** D-08 (design review Q8), D-12 (R2.3)

## Context

The project was always strongly inspired by [Actual Budget](https://actualbudget.org/) without being a clone: on-budget and off-budget accounts, transfers whose category depends on the accounts, payees, a local rule engine, schedules, two-level categories. But each of those ideas was adopted case by case, and in v1 several of them existed only half-way:

| Actual Budget concept | How it works in Actual | v1 |
| --- | --- | --- |
| On-budget / off-budget account | Off-budget accounts are tracked but outside the budget (investments, mortgage) | `Asset.isOnBudget` exists but no logic reads it |
| Starting balance | A "Starting Balance" transaction when the account opens; the balance is always the sum of transactions | Implicit in the balance given at creation, then updated by deltas |
| Payee | Entity with a clean name, a default category, rules | Only the raw bank `details` string |
| Transfer | The payee is the other account; the two transactions are linked | Missing |
| Rules | "If payee or description contains X → category Y", applied on import | Static dictionary on the bank's category label, in Python |
| Schedules | Expected recurring transactions, linked to the real ones | Subscriptions designed without a matching rule |
| Reconcile | Compare with the bank balance; the system adds an adjustment | `recalculate`, with a double-counting bug |
| Category groups | Group → category, exactly two levels | Macro → sub, two levels on read but three possible on write |
| Split transactions | One transaction split over several categories | Missing |
| Budget | Envelope or tracking | One cap per category (`BudgetRule`) |

Decisions taken case by case had become inconsistent with each other. The redesign needed a fixed point to validate every flow against.

## Decision

**Actual Budget is the default reference model.** Every flow starts from how Actual does it; every divergence is declared and justified, in an ADR or in the flow document. The glossary uses Actual's terms where they match ([CONTEXT.md](../CONTEXT.md)).

**In the MVP** (D-12): payees with a default category, transfers as linked pairs, rules in a simple form, starting balance, reconcile.

**After the MVP:** schedules (subscriptions), split transactions, hidden categories, notes, tags.

**Declared divergences:**

1. Analytics, forecasting and machine learning in a dedicated Python service ([ADR-0005](0005-python-science-service-rest.md)); Actual has no forecast.
2. Savings goals with an estimated completion date; Actual only has goal templates on budget amounts.
3. Guided import: a dynamic column mapper with saved templates, and automatic category suggestions (rules, then Python).
4. A multi-tenant web application (D-02) instead of local-first with CRDT sync.
5. The tracking budget as the default model; envelope budgeting possibly later ([ADR-0006](0006-monthly-tracking-budget.md)).

Further divergences decided later are recorded where they apply, for example rule evaluation (first match wins per field, no pre/default/post stages, D-23).

## Alternatives considered

- **Actual as inspiration only**, with no obligation to compare. Rejected: it is how v1 was built, and it produced decisions that contradict each other.
- **Actual's semantics, strictly (a conceptual clone).** Rejected: the project's own strengths (analytics, forecast, goals, guided import) would be dropped or forced into a model not designed for them.

## Consequences

- Each flow document compares the flow with Actual and lists its divergences.
- Payees and rules become new modules; the static category dictionary in Python goes away.
- The MVP is larger than a minimal one: each included concept enables another (payee → rules → import; starting balance → reconcile). A smaller MVP without rules and payees was rejected because the dynamic mapper would have no way to categorise.
- Knowing Actual's behaviour becomes part of designing a flow.
