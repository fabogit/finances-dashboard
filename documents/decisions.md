# Decisions

Every decision of the v2 design has an ID (`D-01`, `D-02`, …) and one row here: a one-line title, the date it was taken and where it is recorded. The documents linked from each row summarise the decision where they rely on it, so they can be read on their own. The full text of each decision, with the options that were rejected, stays in the maintainer's register, outside the repository.

## Taking the next ID

- A new decision takes **the last row plus one**, and its row is added **in the pull request that records the decision**. Two sessions that take the same ID change the same line, so the collision shows as a conflict at rebase, before the merge.
- An ID is never renumbered or reused. A row is written once: later it changes only to say that the decision was superseded, in the pull request of the decision that supersedes it.
- A decision that refines an earlier one says so in its own row ("refines D-…"); the earlier row stays as it is.
- A new ADR takes the number after the last entry of [README § ADRs](README.md#adrs), and its entry is added there in the same pull request as the ADR.

## Index

| ID | Decision | Date | Recorded in |
|----|----------|------|-------------|
| D-01 | Design before code: no new features until the flows are validated, only unambiguous bug fixes | 2026-10-08 | [README § Process decisions](README.md#process-decisions) |
| D-02 | A personal tool and a public portfolio demo, growing into a real multi-user product after the MVP | 2026-10-08 | [vision § Purpose](product/vision.md#purpose), [ADR-0001](adr/0001-userid-on-all-models.md) |
| D-03 | Sources of truth by role: GitHub for status, `documents/` for how and why, session material never a reference | 2026-10-08 | [README § How the documents are used](README.md#how-the-documents-are-used), [AGENTS § Sources of truth](../AGENTS.md#sources-of-truth) |
| D-04 | Versioned documentation in `documents/`, with `adr/` and topic folders, restructured in one pass | 2026-10-08, updated 2026-10-09 | [README § How the documents are used](README.md#how-the-documents-are-used), [#86](https://github.com/fabogit/finances-dashboard/issues/86) |
| D-05 | Guided import of xlsx and csv files with a dynamic column mapper | 2026-10-08 | [flows/import.md](flows/import.md) |
| D-06 | Stateless import preview: nothing is written until the confirm, which the server revalidates | 2026-10-08 | [ADR-0004](adr/0004-stateless-import-staging.md) |
| D-07 | Currencies and wealth: EUR only for now, built to extend; investments as off-budget accounts with adjustments | 2026-10-08, updated 2026-10-09 | [data-model.md](domain/data-model.md), [flows/balances.md](flows/balances.md) |
| D-08 | Actual Budget as the reference model, every divergence declared | 2026-10-08 | [ADR-0002](adr/0002-actual-budget-reference-model.md) |
| D-09 | A tracking budget first; envelope budgeting possibly later | 2026-10-08 | [ADR-0006](adr/0006-monthly-tracking-budget.md) |
| D-10 | Bugs fixed before the redesign: the last two (science client) fixed in #85, the others absorbed by the v2 rewrite | 2026-10-09, updated 2026-10-13 | [#85](https://github.com/fabogit/finances-dashboard/issues/85) |
| D-11 | Balances derived from transactions, with a starting balance transaction and adjustments for changes of value | 2026-10-09 | [ADR-0003](adr/0003-derived-balances.md) |
| D-12 | The Actual Budget concepts in the MVP (payees, transfers, simple rules, starting balance, reconciliation) and the declared divergences | 2026-10-09 | [ADR-0002](adr/0002-actual-budget-reference-model.md) |
| D-13 | Category of an imported row: rules, then the payee's default, then the bank category mapping, with its source shown in the preview | 2026-10-09 | [import § Payee and category of each row](flows/import.md#payee-and-category-of-each-row) |
| D-14 | Python only as a computation service: parsing, mapping, rules and deduplication in the core | 2026-10-09 | [ADR-0005](adr/0005-python-science-service-rest.md) |
| D-15 | Import templates: the chosen template, then the account's default, then the system's proposal; the account chosen at upload | 2026-10-09 | [import § Import templates](flows/import.md#import-templates) |
| D-16 | Layered deduplication: bank ID, exact hash, approximate match; duplicates flagged in the preview, never dropped silently | 2026-10-09 | [ADR-0007](adr/0007-layered-deduplication.md) |
| D-17 | Monthly budget per category, with convenience commands and a percentage of the previous month's income | 2026-10-09 | [ADR-0006](adr/0006-monthly-tracking-budget.md) |
| D-18 | `userId` on every model from the Schema v2 rewrite, with constraints and indexes scoped per user | 2026-10-09 | [ADR-0001](adr/0001-userid-on-all-models.md) |
| D-19 | Schema applied with `prisma db push` until the MVP, then a `prisma migrate` baseline | 2026-10-09, updated 2026-10-13 | [AGENTS § Database sync method](../AGENTS.md#database-sync-method) |
| D-20 | A fast and flexible seed for development | 2026-10-09 | [#90](https://github.com/fabogit/finances-dashboard/issues/90) |
| D-21 | REST to the science service behind a `ScienceClient`, with timeouts and retries; NATS at the first real asynchronous job | 2026-10-09 | [ADR-0005](adr/0005-python-science-service-rest.md) |
| D-22 | Payee from the template's column, or from a deterministic cleanup and rename rules; saving defaults and rules only proposed | 2026-10-09 | [rules-payees § Imported payee](flows/rules-payees.md#imported-payee) |
| D-23 | Rules: ordered conditions and actions, the first rule wins field by field; applied in the preview, and to existing transactions only on request | 2026-10-09 | [rules-payees § Rules](flows/rules-payees.md#rules) |
| D-24 | Transfers as linked pairs with a generated counterpart; transfer detection in the import only as a suggestion | 2026-10-09 | [flows/transfers.md](flows/transfers.md) |
| D-25 | Transaction `kind`, and what counts as income, spending and Net Worth for each kind | 2026-10-09 | [ADR-0008](adr/0008-transaction-kind.md) |
| D-26 | Savings goals with progress always computed; a dedicated account in the MVP | 2026-10-09 | [flows/goals.md](flows/goals.md) |
| D-27 | Category groups and categories as two models, two levels enforced by the schema; transactions and budgets only on categories | 2026-10-09 | [categories § Groups and categories](flows/categories.md#groups-and-categories) |
| D-28 | Uncategorised means no category (`null`), not a system category | 2026-10-09 | [categories § Uncategorised](flows/categories.md#uncategorised) |
| D-29 | Deleting a category moves its transactions, payee defaults and rule actions to a chosen category, after a preview with the counts | 2026-10-09 | [categories § Deleting a category](flows/categories.md#deleting-a-category) |
| D-30 | Calendar dates with an optional local time; the user's time zone only for "today" and for transactions created by the app | 2026-10-09 | [data-model § Conventions](domain/data-model.md#conventions) |
| D-31 | A deterministic seed generator with profiles, updated with every change of the model; refines D-20 | 2026-10-09 | [setup § Seed](development/setup.md#seed), [#90](https://github.com/fabogit/finances-dashboard/issues/90) |
| D-32 | The structure of `documents/`; of `.agents/` only `workflows/` is versioned | 2026-10-09, updated 2026-10-13 | [README](README.md), [AGENTS § Workflows](../AGENTS.md#workflows), [#86](https://github.com/fabogit/finances-dashboard/issues/86) |
| D-33 | The MVP scope, and when an area is done: flow document, examples as tests, `demo` seed, Swagger | 2026-10-09 | [vision § MVP scope](product/vision.md#mvp-scope) |
| D-34 | The Angular client in the MVP, each screen started once its API is closed and tested | 2026-10-09 | [vision § MVP scope](product/vision.md#mvp-scope), [architecture overview](architecture/overview.md) |
| D-35 | The current forecast kept, with its input filtered by `kind` and real HTTP errors | 2026-10-09 | [analytics § Forecast input](flows/analytics.md#forecast-input) |
| D-36 | Subscriptions, the forecast split and authentication designed after the MVP, their questions noted | 2026-10-09 | [open-questions.md](product/open-questions.md) |
| D-37 | The schema rewritten in one pass, then the modules rebuilt flow by flow | 2026-10-09 | [roadmap](product/roadmap.md) |
| D-38 | Test-first per flow: the examples of the specs become the tests | 2026-10-09 | [roadmap](product/roadmap.md), [README § Specs](README.md#specs) |
| D-39 | GitHub flow and the pull request process | 2026-10-09 | [README § Process decisions](README.md#process-decisions), [AGENTS § Commits and pull requests](../AGENTS.md#commits-and-pull-requests) |
| D-40 | Transaction search through `POST /transactions/search`; the HTTP `QUERY` method a post-MVP experiment | 2026-10-09 | [#74](https://github.com/fabogit/finances-dashboard/issues/74) |
| D-41 | GitHub realigned with the redesign, with texts applied after the maintainer's approval; superseded in part by D-45 | 2026-10-09 | [AGENTS § GitHub](../AGENTS.md#github) |
| D-42 | One SemVer version for the whole repository: a pre-release per step, the MVP is `v2.0.0` | 2026-10-13 | [roadmap § Versioning](product/roadmap.md#versioning), [AGENTS § Releases](../AGENTS.md#releases) |
| D-43 | The order of import templates confirmed; refines D-15 | 2026-10-13 | [import § Import templates](flows/import.md#import-templates) |
| D-44 | GitHub style: milestones closed by a review issue, area labels, issues in English with a fixed structure | 2026-10-13 | [AGENTS § GitHub](../AGENTS.md#github) |
| D-45 | Six MVP milestones by theme and two after the MVP; supersedes the milestones of D-41 | 2026-10-13 | [roadmap § Milestones](product/roadmap.md#milestones) |
| D-46 | Specs first for the core: data model and flow documents written before Schema v2 and kept current with the code | 2026-10-13 | [README § Specs](README.md#specs) |
| D-47 | Spec conventions: Given / When / Then examples with per-area IDs, markers for undecided points | 2026-10-13 | [README § Specs](README.md#specs) |
| D-48 | Per-user isolation built before authentication: a fixed user in the request context and a Prisma extension | 2026-10-15 | [architecture § Multi-tenancy](architecture/overview.md#multi-tenancy), [ADR-0001](adr/0001-userid-on-all-models.md) |
| D-49 | "No result" outcomes of the forecast and the goal projection: 422 for insufficient data, an explicit outcome for an unreachable goal | 2026-10-15 | [science contract § Failure handling](architecture/science-contract.md#failure-handling) |
| D-50 | Core toolchain on Vite+ before the v2 tests; superseded in part by D-53 | 2026-11-01 | [roadmap § Open risks](product/roadmap.md#open-risks) |
| D-51 | Science toolchain on uv, `pyproject.toml` and ruff, in M1 | 2026-11-01 | [roadmap § Steps](product/roadmap.md#steps), [#110](https://github.com/fabogit/finances-dashboard/issues/110) |
| D-52 | Native HTTP adapter `@nestjs/platform-node` in M1, not before 2026-11-17 | 2026-11-01 | [roadmap § Steps](product/roadmap.md#steps), [#88](https://github.com/fabogit/finances-dashboard/issues/88) |
| D-53 | Core toolchain on the NestJS 12 `nest new` defaults, with oxfmt instead of Prettier; supersedes the Vite+ part of D-50 | 2026-11-09 | [setup § Toolchain](development/setup.md#toolchain) |
| D-54 | Validation (Standard Schema with Zod, or class-validator) chosen before Schema v2 | 2026-11-09 | [roadmap § Steps](product/roadmap.md#steps), [#113](https://github.com/fabogit/finances-dashboard/issues/113) |
| D-55 | `@nestjs/observe` not now: nothing is deployed to observe | 2026-11-09 | [#114](https://github.com/fabogit/finances-dashboard/issues/114) |
| D-56 | The static fallback bug in its own M1 issue, before the core toolchain | 2026-11-09 | [#111](https://github.com/fabogit/finances-dashboard/issues/111), [#112](https://github.com/fabogit/finances-dashboard/issues/112) |
| D-57 | Where the core toolchain diverges from `nest new` | 2026-11-09 | [setup § Divergences from `nest new`](development/setup.md#divergences-from-nest-new) |
| D-58 | A `User` table; every `userId` is a foreign key to it | 2026-11-09 | [data-model § User](domain/data-model.md#user), [ADR-0001](adr/0001-userid-on-all-models.md) |
| D-59 | Money in integer cents, everywhere | 2026-11-09 | [ADR-0009](adr/0009-money-in-integer-cents.md) |
| D-60 | v2 model names from the glossary: `Account`, `Transaction`, `MonthlyBudget` | 2026-11-09 | [data-model § Conventions](domain/data-model.md#conventions), [CONTEXT.md](CONTEXT.md) |
| D-61 | A finer `AccountType`, used only for grouping | 2026-11-09 | [data-model § AccountType](domain/data-model.md#accounttype) |
| D-62 | `ExpenseType` (50/30/20) kept, optional | 2026-11-09 | [data-model § ExpenseType](domain/data-model.md#expensetype) |
| D-63 | Closing and deleting an account as in Actual Budget | 2026-11-09 | [balances § Closing and deleting an account](flows/balances.md#closing-and-deleting-an-account) |
| D-64 | `isOnBudget` fixed when the account is created | 2026-11-09 | [balances § On-budget and off-budget](flows/balances.md#on-budget-and-off-budget) |
| D-65 | Exactly one starting balance per account, and nothing dated before it | 2026-11-09 | [balances § Opening an account](flows/balances.md#opening-an-account) |
| D-66 | The current balance stops at today; future transactions are shown apart | 2026-11-09 | [balances § Balance at a date](flows/balances.md#balance-at-a-date) |
| D-67 | Reconciliation and revaluation as one operation: set the balance at a date | 2026-11-09 | [balances § Setting the balance at a date](flows/balances.md#setting-the-balance-at-a-date) |
| D-68 | No cleared or reconciled state in the MVP | 2026-11-09 | [flows/balances.md](flows/balances.md) |
| D-69 | A category only on `REGULAR` transactions and on the on-budget side of a transfer that crosses the boundary | 2026-11-09 | [data-model § Transaction](domain/data-model.md#transaction), [flows/balances.md](flows/balances.md) |
| D-70 | The two sides of a transfer linked through `transferId` and written in one database transaction | 2026-11-09 | [transfers § The pair](flows/transfers.md#the-pair) |
| D-71 | Across the on/off-budget boundary only the on-budget side of a transfer carries the category | 2026-11-09 | [transfers § Category](flows/transfers.md#category) |
| D-72 | No payee for transfers | 2026-11-09 | [transfers § Payee](flows/transfers.md#payee) |
| D-73 | Editing transfers as in Actual Budget, and linking two existing transactions | 2026-11-09 | [transfers § Editing a transfer](flows/transfers.md#editing-a-transfer) |
| D-74 | Income groups through `CategoryGroup.isIncome`: income is the income categories, not the sign | 2026-11-09 | [categories § Income categories](flows/categories.md#income-categories) |
| D-75 | Category names unique within their group, ignoring case | 2026-11-09 | [categories § Names](flows/categories.md#names) |
| D-76 | Deleting a category without a target removes the rule actions that set it | 2026-11-09 | [categories § Deleting a category](flows/categories.md#deleting-a-category) |
| D-77 | Deleting a group with categories as in Actual Budget: one target for all of them | 2026-11-09 | [categories § Deleting a group](flows/categories.md#deleting-a-group) |
| D-78 | Plain notes on transactions in the MVP; refines D-12 | 2026-11-09 | [ADR-0002](adr/0002-actual-budget-reference-model.md), [data-model § Transaction](domain/data-model.md#transaction) |
| D-79 | One rule for the names users see: trimmed, and unique in their scope ignoring case | 2026-11-10 | [data-model § Conventions](domain/data-model.md#conventions) |
| D-80 | Closing an account, details aligned with Actual Budget; refines D-63 | 2026-11-10 | [balances § Closing and deleting an account](flows/balances.md#closing-and-deleting-an-account) |
| D-81 | A closed account can be reopened | 2026-11-10 | [balances § Closing and deleting an account](flows/balances.md#closing-and-deleting-an-account) |
| D-82 | The marker criterion of #104 limited to the spec files | 2026-11-10 | [#104](https://github.com/fabogit/finances-dashboard/issues/104) |
| D-83 | A template proposed automatically when the header matches exactly; refines D-15 | 2026-11-12 | [import § Uploading a file](flows/import.md#uploading-a-file) |
| D-84 | An optional notes column in the import template | 2026-11-12 | [import § Import templates](flows/import.md#import-templates) |
| D-85 | Rows not booked yet shown deselected in the import preview | 2026-11-12 | [import § Reading and validating the rows](flows/import.md#reading-and-validating-the-rows) |
| D-86 | What the exact import hash is made of | 2026-11-12 | [import § The exact hash](flows/import.md#the-exact-hash) |
| D-87 | What the user can do with an already imported row and with a possible duplicate | 2026-11-12 | [import § What the user can do](flows/import.md#what-the-user-can-do) |
| D-88 | The window of the approximate match: per template, from 1 to 90 days, 7 by default | 2026-11-12 | [import § The window of the approximate match](flows/import.md#the-window-of-the-approximate-match) |
| D-89 | The fields of a merged row: date and time from the bank | 2026-11-12 | [import § Merging a row with an existing transaction](flows/import.md#merging-a-row-with-an-existing-transaction) |
| D-90 | A confirm that differs at revalidation saves nothing and answers 409 with a new preview | 2026-11-12 | [import § Confirming](flows/import.md#confirming) |
| D-91 | Merging and deleting a payee; rules that reference a deleted payee or account | 2026-11-12 | [rules-payees § What rules reference](flows/rules-payees.md#what-rules-reference) |
| D-92 | Cleanup of the imported payee: fixed patterns in the MVP, per-template patterns with suggestions later; refines D-22 | 2026-11-12 | [rules-payees § Imported payee](flows/rules-payees.md#imported-payee) |
| D-93 | The operators of rule conditions | 2026-11-12 | [rules-payees § Rules](flows/rules-payees.md#rules) |
| D-94 | On a transaction entered by hand, rules fill only the empty fields; refines D-23 | 2026-11-12 | [rules-payees § Where rules run](flows/rules-payees.md#where-rules-run) |
| D-95 | Rule conditions, rule actions and template category mappings in child tables with foreign keys | 2026-11-12 | [data-model.md](domain/data-model.md), [flows/categories.md](flows/categories.md) |
| D-96 | `REGULAR` transactions on off-budget accounts count in neither income nor spending; refines D-25 and D-69 | 2026-11-12 | [ADR-0008](adr/0008-transaction-kind.md), [analytics § What counts](flows/analytics.md#what-counts) |
| D-97 | Transactions without a category counted by sign | 2026-11-12 | [ADR-0008](adr/0008-transaction-kind.md), [analytics § Income or spending](flows/analytics.md#income-or-spending) |
| D-98 | Net Worth history: one point per month end, split by account type | 2026-11-12 | [analytics § Net Worth](flows/analytics.md#net-worth) |
| D-99 | The 50/30/20 view in the analytics, in the MVP; refines D-62 | 2026-11-12 | [analytics § 50/30/20](flows/analytics.md#503020) |
| D-100 | The forecast splits income and spending by sign; refines D-35 | 2026-11-12 | [analytics § Forecast input](flows/analytics.md#forecast-input) |
| D-101 | A percentage of income recomputed on every read, and the limits of budget amounts; refines D-17 | 2026-11-12 | [budget § Percentage of the previous month's income](flows/budget.md#percentage-of-the-previous-months-income) |
| D-102 | Rounding to the cent, half up; refines D-59 | 2026-11-12 | [ADR-0009](adr/0009-money-in-integer-cents.md), [budget § Rounding](flows/budget.md#rounding) |
| D-103 | Budgets on income categories too, as in the Actual Budget tracking budget | 2026-11-12 | [budget § Budget analysis](flows/budget.md#budget-analysis) |
| D-104 | Budget states without notifications; a missing row is not a budget of 0 | 2026-11-12 | [budget § Budget analysis](flows/budget.md#budget-analysis) |
| D-105 | Convenience commands as in Actual Budget; refines D-17 | 2026-11-12 | [budget § Convenience commands](flows/budget.md#convenience-commands) |
| D-106 | A goal always has an account, and an account with a goal cannot be deleted; refines D-26 | 2026-11-12 | [goals § Creating a goal](flows/goals.md#creating-a-goal), [flows/balances.md](flows/balances.md) |
| D-107 | One non-archived goal per account, names unique among non-archived goals | 2026-11-12 | [flows/goals.md](flows/goals.md) |
| D-108 | The input and the outcomes of the goal projection; refines D-49 | 2026-11-12 | [goals § Projection](flows/goals.md#projection) |
| D-109 | An optional target date for goals; no colour or icon | 2026-11-12 | [goals § Target date](flows/goals.md#target-date) |
| D-110 | Case-insensitive and partial uniqueness through normalised columns; refines D-79 and D-107 | 2026-11-12 | [data-model § Conventions](domain/data-model.md#conventions) |
| D-111 | Composite foreign keys with `userId`, and an isolation test for every reference; refines D-48 | 2026-11-12 | [ADR-0001](adr/0001-userid-on-all-models.md), [data-model § Conventions](domain/data-model.md#conventions) |
| D-112 | A minimal client in the MVP: goals, payees and rules, and import templates stay API-only; refines D-34 | 2026-11-12 | [vision § MVP scope](product/vision.md#mvp-scope), [roadmap § Steps](product/roadmap.md#steps) |
| D-113 | Rules all in #79, and #74 stays a pure ledger; refines D-23 and D-94 | 2026-11-12 | [#79](https://github.com/fabogit/finances-dashboard/issues/79), [#74](https://github.com/fabogit/finances-dashboard/issues/74) |
| D-114 | A transfer counterpart cannot fall before the starting balance of its account; refines D-65 and D-73 | 2026-11-15 | [flows/transfers.md](flows/transfers.md), [flows/balances.md](flows/balances.md) |
| D-115 | On a closed account only the classification of transactions changes; refines D-63 | 2026-11-15 | [balances § Closing and deleting an account](flows/balances.md#closing-and-deleting-an-account), [flows/transfers.md](flows/transfers.md) |
| D-116 | The runtime on Node 26 LTS | 2026-11-15 | [roadmap § Steps](product/roadmap.md#steps), [#133](https://github.com/fabogit/finances-dashboard/issues/133) |
| D-117 | #93 retires `POST /process`, on the core and on the Python side together; refines D-14 | 2026-11-15 | [#93](https://github.com/fabogit/finances-dashboard/issues/93), [#96](https://github.com/fabogit/finances-dashboard/issues/96), [#116](https://github.com/fabogit/finances-dashboard/issues/116) |
| D-118 | Closing, reopening and deleting accounts in their own issue; refines D-63, D-80, D-81 and D-115 | 2026-11-15 | [#134](https://github.com/fabogit/finances-dashboard/issues/134) |
| D-119 | A versioned index of the decisions, where the next decision ID and ADR number are taken | 2026-11-15 | This index, [README § Decisions and ADRs](README.md#decisions-and-adrs), [#135](https://github.com/fabogit/finances-dashboard/issues/135) |
| D-120 | Validation with Standard Schema and Zod for inputs, responses and the environment, with rules for amounts, query integers, `null` and defaults; settles D-54 | 2026-11-16 | [ADR-0010](adr/0010-validation-with-zod.md), [architecture § Validation and DTOs](architecture/overview.md#validation-and-dtos) |
