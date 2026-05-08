# Data Dictionary

This document defines the data models used in the system, their purposes, and the meaning of enumerated values.

## 🗄️ Main Models (Entities)

### 1. Asset
Represents a "container" of economic value (checking account, securities portfolio, real estate).
- `name`: Identification name (e.g., "Fineco Account").
- `type`: Asset category (see `AssetType` Enum).
- `balance`: The current calculated or declared value.
- `currency`: Base currency (default: EUR).

### 2. EnrichedTransaction
The "clean" and classified transaction shown to the user.
- `amount`: Monetary value (positive for income, negative for expenses).
- `category`: Relationship with a hierarchical category.
- `asset`: The asset on which the transaction had an impact.
- `savingsGoal`: (Optional) Goal to which this transaction contributes.

### 3. Category
Hierarchical structure for expense classification.
- `parentId`: ID of the macro-category (if present).
- `type`: Classification according to the 50/30/20 rule (Needs, Wants, Savings).
- `isSystem`: If `true`, the category is protected and cannot be deleted (e.g., "Unclassified").

### 4. SavingsGoal
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
- **Asset <-> Transaction**: Every transaction must belong to an asset. Deleting a transaction recalculates the asset's `balance`.
- **Category <-> BudgetRule**: Each category can have one budget rule (1:1).
- **Category hierarchy**: Supports infinite recursion (though limited to 2 levels in the frontend for simplicity).
