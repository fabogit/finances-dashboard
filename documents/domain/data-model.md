# Data model (v1)

> **This is the v1 model, as implemented on `main` at `v1.0.0`** (`backend-core/prisma/schema.prisma`). The v2 model replaces it: issue #104 rewrites this document as the v2 spec, and Schema v2 (#89) implements it. The decisions that change it are in [ADR-0001](../adr/0001-userid-on-all-models.md), [ADR-0003](../adr/0003-derived-balances.md), [ADR-0006](../adr/0006-monthly-tracking-budget.md) and [ADR-0008](../adr/0008-transaction-kind.md); terms are in the [glossary](../CONTEXT.md).

Money columns are `Decimal`; every model has a UUID `id`, and most have `createdAt` / `updatedAt`.

## Models

### Asset

An account: a container of money or value (checking account, investment portfolio, property, cash, debt).

- `userId`: owner, default `"demo_user"`.
- `name`, `institution` (optional), `type` (`AssetType`), `currency` (3 letters, default `EUR`).
- `balance`: `Decimal(15,2)`, stored and updated by deltas when transactions change.
- `isOnBudget`: `true` for liquid accounts that belong to the everyday budget, `false` for accounts tracked only for Net Worth. No logic reads it in v1.
- Relations: `transactions`, `history` (`AssetHistory`), `savingsGoals`, `defaultForCategories`.

### AssetHistory

Daily closing balance of an asset.

- `assetId` (cascade delete), `date` (`DateTime`), `balance` (`Decimal(15,2)`); unique on `(assetId, date)`.
- The snapshot is written for the day the change is made, not for the transaction's date.

### EnrichedTransaction

A clean, classified transaction, shown to the user.

- `amount`: `Decimal(10,2)`, positive for income, negative for spending. Note the different precision from balances (`15,2`).
- `date`: `DateTime`. `currency` (default `EUR`).
- `assetId`: optional; deleting the asset sets it to `null`. A transaction can therefore exist without an account.
- `categoryId`: optional; deleting a referenced category is restricted.
- `savingsGoalId`: optional; deleting the goal sets it to `null`.
- `details`, `operation`, `account`: bank text and fields as imported.
- `importBatchId`, `originalLine`: where the row came from.
- `transactionHash`: SHA-256 of `date|amount|details|account|operation`, **unique across the whole database**; empty for manual transactions.

### RawTransaction

A bank row as read from the file, all fields as strings: `date`, `amount`, `details`, `operation`, `account`, `category`, `currency`, `accountingStatus`, plus `importBatchId` and `originalLine`. Saved outside the database transaction of the import and never deduplicated.

### Category

Two-level hierarchy through a self-relation (`parentId`, delete restricted while children exist). Nothing stops a third level from being written.

- `userId` (default `"demo_user"`), `name`, `type` (`ExpenseType`, default `UNCLASSIFIED`), `color`, `icon`.
- `systemKey`: stable key for seeded categories; `isSystem`: protected from deletion; `isVerified`: `false` for categories created automatically by an import.
- `defaultAssetId`, `defaultGoalId`: where the upload routes a transaction of this category.
- Unique on `(name, parentId, userId)`. In PostgreSQL a `NULL` `parentId` is always distinct, so duplicate top-level categories are possible.
- `budgetRule`: at most one.

### BudgetRule

One budget per category, valid for every month.

- `categoryId` (unique, cascade delete), `ruleType` (`BudgetRuleType`), `limitValue` (`Decimal(10,2)`): an amount or a percentage of income.

### SavingsGoal

- `userId` (default `"demo_user"`), `name`, `targetAmount`, `currentAmount` (`Decimal(15,2)`, stored and updated by deltas from linked transactions), `deadline` (optional), `status` (`GoalStatus`), `color`, `icon`.
- `assetId`: optional; present in the schema but not settable through the create API.
- Relations: `transactions`, `categories` that use it as their default goal.

## Enumerations

- **`AssetType`:** `CASH` (accounts, cash), `INVESTMENT` (stocks, ETFs, funds, crypto), `REAL_ESTATE`, `VEHICLE`, `DEBT` (mortgages and loans, negative for Net Worth), `OTHER`.
- **`ExpenseType`** (50/30/20 rule): `NEEDS`, `WANTS`, `SAVINGS`, `UNCLASSIFIED`.
- **`BudgetRuleType`:** `FIXED_AMOUNT`, `PERCENTAGE_OF_INCOME`.
- **`GoalStatus`:** `ACTIVE`, `COMPLETED`, `PAUSED`, `CANCELLED`. `COMPLETED` is never set automatically.

## Not in v1

Entities that earlier documents described as planned do not exist in the v1 schema: `User`, `Payee`, `Subscription`, `ExchangeRate`, and the transfer fields `isTransfer` / `pairedTransactionId`. The v2 decisions replace them: payees and transfers as linked pairs (D-12, D-24), transaction `kind` instead of `isTransfer` (D-25), EUR only in the MVP (D-07), subscriptions and authentication after the MVP (D-36).
