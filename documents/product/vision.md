# Product vision

What the Finance Dashboard is for, what the MVP contains and where it can go afterwards. Work status is on GitHub; the order of the work is in the [roadmap](roadmap.md).

## Purpose

A personal finance tool that also serves as a public portfolio demo (D-02):

- **Now:** one person's finances, plus a demo running on generated data.
- **After the MVP:** a real multi-user product. The foundations for it are laid now: from Schema v2 every model carries `userId` ([ADR-0001](../adr/0001-userid-on-all-models.md), D-18), and isolation is enforced from M2, before authentication (D-48).

The goal is to move from *seeing what was spent* to *planning*: a monthly budget, savings goals with an estimated completion date, a forecast, and an accurate Net Worth history.

## Reference model

[Actual Budget](https://actualbudget.org/) is the reference model ([ADR-0002](../adr/0002-actual-budget-reference-model.md)). The project follows Actual by default and declares where it differs:

1. Analytics, forecasting and machine learning in a dedicated Python service.
2. Savings goals with an estimated completion date.
3. Guided import with a column mapper, saved templates and automatic category suggestions.
4. A multi-tenant web application instead of local-first sync.
5. The tracking budget as the default; envelope budgeting possibly later.

## MVP scope

The MVP is version `v2.0.0` (D-33, D-42).

| Area | In the MVP | After the MVP |
| --- | --- | --- |
| Schema | One rewrite: `userId` everywhere, transaction `kind`, calendar date plus optional time, category groups and categories, payees, rules, import templates, monthly budgets, transfer pairs | Holdings, exchange rates, subscriptions |
| Accounts | Starting balance, derived balance, reconciliation, on/off-budget accounts, value adjustments | Automatic prices |
| Import | Templates and column mapper, stateless preview, layered deduplication, payees, rules, transfer detection | Machine-learning category suggestions |
| Transactions | CRUD, manual transfers (`POST /transfers`), applying rules to existing transactions, search (`POST /transactions/search`) | Split transactions, tags, advanced notes |
| Categories | Groups and categories, deletion that moves everything to a chosen category | Hidden categories |
| Budget | Monthly amounts per category, percentage of the previous month's income, convenience commands | Envelope budgeting |
| Goals | Linked to a dedicated account, computed progress, completion estimate | Shares of a common account |
| Analytics | In the database, with the `kind` rules: summary, distribution, trends, budget analysis, Net Worth history in EUR | Multiple currencies |
| Science | Robust `ScienceClient` over REST, goal projection, the existing forecast with filtered input | NATS, machine learning, forecast split |
| Client | Angular screens for accounts, import, transactions, categories, budget and dashboard, each built once its API is closed (D-34) | Desktop packaging |
| Development | Profile-based seed, versioned documentation | Authentication, roles, demo sandbox |

An area is done when its flow document is written, the examples from the spec are tests, the `demo` seed profile exercises it, and Swagger is up to date.

## User journey (v2)

1. **Accounts.** The user creates accounts, each with a starting balance, on-budget or off-budget, and optionally a default import template.
2. **Import.** The user uploads a bank export (`.xlsx` or `.csv`) for an account. A template maps the columns; the preview shows every row with its payee, category and the source of each, duplicates and suggested transfers. The user fixes what is wrong, may save a payee default or a rule, and confirms.
3. **Review.** Uncategorised transactions are a view of their own; rules can be applied to existing transactions, with a preview of the changes.
4. **Planning.** The user sets monthly amounts per category and savings goals on dedicated accounts.
5. **Insight.** Spending and income by category and month, budget analysis, Net Worth over time, the forecast and the estimated goal completion dates.

## Beyond the MVP

Ideas accepted as direction, not designed and not scheduled. Open questions are listed in [open-questions.md](open-questions.md).

- **Subscriptions** (Actual's schedules): explicit recurring payments with a calendar, feeding the forecast (#78), and a forecast split into trend and recurrence (#77).
- **Wealth:** holdings with tickers and automatic prices that generate value adjustments; multiple currencies with manual, then automatic, exchange rates (#81); tax estimates such as capital gains.
- **Multi-user:** authentication, tenancy, roles and the demo sandbox (#62–#65).
- **Client:** translations (English by default; Italian, French, Spanish, German and Portuguese), and desktop packaging with Tauri. A fully offline desktop build with SQLite would conflict with today's PostgreSQL-specific choices (raw SQL, per-user isolation), so it would need its own design.
- **Open banking:** bank APIs instead of file uploads.
