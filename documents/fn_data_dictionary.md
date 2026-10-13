# Data Dictionary

This document defines the data models used in the system, their purposes, and the meaning of enumerated values.

---

## 🗄️ Main Models (Entities)

### 1. User `[PLANNED]`
Represents a registered user in the multi-tenant system.
- `email`: Unique login identifier.
- `passwordHash`: Bcrypt-hashed password.
- `role`: Access level (USER, GUEST).
- `createdAt` / `updatedAt`: Auditing timestamps.

### 2. Asset
Represents a "container" of economic value (checking account, securities portfolio, real estate, cash).
- `name`: Identification name (e.g., "Fineco Account").
- `type`: Asset category (see `AssetType` Enum).
- `balance`: The current calculated or declared value.
- `currency`: Base currency (default: EUR).
- `isOnBudget`: If `true`, the asset is liquid and part of everyday budget calculations. If `false`, it is tracked only for Net Worth (e.g. tracking broker).

### 3. EnrichedTransaction
The "clean" and classified transaction shown to the user.
- `amount`: Monetary value (positive for income, negative for expenses).
- `category`: Relationship with a hierarchical Category.
- `asset`: The asset on which the transaction had an impact.
- `savingsGoal`: (Optional) Goal to which this transaction contributes.
- `payee`: (Optional) Normalized payee (e.g. "Amazon").
- `transactionHash`: Deterministic SHA-256 hash used to prevent duplicate transaction imports.
- `isTransfer`: `[PLANNED]` Boolean flag indicating if this is an internal transfer.
- `pairedTransactionId`: `[PLANNED]` Self-referential UUID pointing to the symmetric counterpart of a transfer.

### 4. Category
Hierarchical structure for expense classification.
- `name`: Category label.
- `systemKey`: `[PLANNED]` (Optional) Immutable string (e.g. `DINING_OUT`) to link AI categorizations even if the user renames the category label.
- `parentId`: ID of the macro-category (if present).
- `type`: Classification according to the 50/30/20 rule (Needs, Wants, Savings).
- `isSystem`: If `true`, the category is protected and cannot be deleted (e.g., "Unclassified").

### 5. Payee `[PLANNED]`
Normalized entity representing a transaction beneficiary.
- `name`: Cleaned name (e.g. "Lidl", "Netflix").
- `defaultCategoryId`: (Optional) Default category assigned to new transactions matching this payee.

### 6. Subscription `[PLANNED]`
Represents a recurring payment managed explicitly.
- `name`: Subscription name (e.g. "Spotify").
- `amount`: Recurring cost.
- `frequency`: Recurrence interval (WEEKLY, MONTHLY, YEARLY).
- `status`: Active or suspended status (ACTIVE, PAUSED).
- `nextBillingDate`: Upcoming billing event date.
- `startDate` / `endDate`: Timeframe limits of the subscription.

### 7. ExchangeRate `[PLANNED]`
Stores manual currency conversion rates for Net Worth reporting.
- `from`: Origin currency ISO code (e.g. "USD").
- `to`: Target currency ISO code (e.g. "EUR").
- `rate`: Conversion multiplier.
- `date`: Date when the conversion rate is effective.

### 8. SavingsGoal
Long-term savings target.
- `targetAmount`: The target amount to reach.
- `currentAmount`: The accumulated amount (updated via linked transactions).

---

## 🔢 Enumerations (Enums)

### AssetType
Defines the nature of the asset for statistical aggregations:
- `CASH`: Checking accounts, cash, and immediate liquidity.
- `INVESTMENT`: Stocks, ETFs, Funds, and Crypto.
- `REAL_ESTATE`: Real estate properties.
- `VEHICLE`: Cars, motorcycles, etc.
- `DEBT`: Mortgages or loans (values that negatively affect Net Worth).

### ExpenseType
Used for budget analysis according to the 50/30/20 framework:
- `NEEDS`: Essential expenses (rent, utilities, groceries).
- `WANTS`: Discretionary expenses (restaurants, hobbies, travel).
- `SAVINGS`: Savings, investments, or debt repayment.

### GoalStatus
- `ACTIVE`: The goal is in progress.
- `COMPLETED`: Goal achieved.
- `PAUSED/CANCELLED`: States for goals that are no longer a priority.

---

## 🔗 Key Relationships

- **User <-> All Entities** `[PLANNED]`: Every table contains a cascading `userId` link for multi-tenant isolation.
- **Asset <-> Transaction**: Every transaction must belong to an asset. Deleting a transaction recalculates the asset's daily closing balance snapshot.
- **Category <-> BudgetRule**: Each category can have one budget rule (1:1).
- **Category hierarchy**: Supports recursive parents/children.
- **Transaction <-> Transaction** `[PLANNED]`: Bidirectional 1:1 relation mapping symmetric transfers via `pairedTransactionId`.
