# Categories

How transactions and budget amounts are classified: category groups that contain categories, exactly two levels, and "uncategorised" as the absence of a category. Deleting a category moves everything that pointed to it. Models and fields are defined in the [data model](../domain/data-model.md).

**Decisions:** D-27 (groups and categories as two models; transactions and budgets only on categories; exactly two levels), D-28 (uncategorised is `null`; `systemKey` only to recognise bootstrap categories; no protected categories), D-29 (deletion moves transactions, payee defaults and rule actions to a chosen category or to `null`, deletes monthly budgets with a warning, and previews the counts first), D-48 (every query scoped to the user), D-62 (optional 50/30/20 classification), D-74 (income groups), D-75 (category names unique per group, case-insensitive), D-76 (a rule action with no target is removed), D-77 (deleting a group).

## Behaviour

### Groups and categories

A `CategoryGroup` is a container, such as "Home". A `Category` belongs to exactly one group, such as "Home › Utilities". Transactions (`Transaction.categoryId`), monthly budgets (`MonthlyBudget.categoryId`), payee defaults (`Payee.defaultCategoryId`) and rule actions reference categories, never groups. A category cannot contain other categories: the schema has no parent on `Category`, so a third level cannot be written (D-27).

A category can move to another group; its transactions, budget amounts, payee defaults and rules follow it unchanged. It cannot move between an income group and a spending group ([Income categories](#income-categories)).

A category can carry a 50/30/20 classification, `Category.expenseType`: `NEEDS`, `WANTS` or `SAVINGS`, or `null` when not classified (D-62). The view that reads it is defined in the analytics and budget flows.

### Uncategorised

A transaction without a category has `Transaction.categoryId` = `null` (D-28). There is no special "Uncategorized" category to create, protect or translate; analytics show `null` as a separate entry, and uncategorised transactions have a view of their own. Transfers between two on-budget accounts are always uncategorised (D-28, [transfers](transfers.md#category)).

### Bootstrap categories

A new user starts with a set of groups and categories created by the bootstrap; each has a `Category.systemKey` so the system can recognise it (for translations or default rules). The key does not protect it: the user can rename, move or delete any category (D-28). Which categories the bootstrap creates is part of the seed (D-31).

### Income categories

A group is either an income group or a spending group (`CategoryGroup.isIncome`). Income, for the budget's percentage of income and for the analytics, is the transactions in the categories of income groups, not the positive amounts: a refund of +30.00 on "Shopping" reduces Shopping's spending and is not income (D-74).

- A user can have several income groups, such as "Work" and "Investments", and can delete any of them.
- A category never moves between an income group and a spending group, and a deletion never moves an income category's contents to a spending category, or the reverse: past income would become spending (D-74, as in Actual Budget).

### Names

Group names are unique per user (D-27, D-48). Category names are unique within their group, ignoring case: "Other" can exist in "Home" and in "Car", but "Home" cannot hold both "Other" and "other" (D-75). Because a name alone can be ambiguous, categories are shown as "Group › Category", and mappings refer to them by ID.

### Deleting a category

1. **Preview.** The user asks to delete a category and chooses a target category or none. The system answers with the counts of what points to the category: transactions, monthly budgets, payee defaults and rule actions. Nothing changes yet (D-29).
2. **Confirm.** In one database transaction:
   - transactions move to the target, or to `null`;
   - payee defaults move to the target, or to `null`;
   - rule actions that set the category move to the target; with no target, they are removed (see below);
   - the category's monthly budgets are deleted; the warning was in the preview;
   - the category is deleted.

The target belongs to the same user, is not the category being deleted, and is on the same side of the income/spending line (D-74).

With no target, a rule action "set category" that pointed to the deleted category is removed, not turned into "set uncategorised": since the first rule that sets a field wins (D-23), an action that sets `null` would silently stop later rules from setting the category. A rule left without actions is kept and shown as having none, so the user can fix or delete it (D-76).

### Deleting a group

As in Actual Budget (D-77): an empty group is deleted directly. A group with categories is deleted as one deletion of all its categories, following the steps above, with one target category (or none) for all of them and one preview that adds up their counts. The target is outside the group being deleted.

## Invariants

- A transaction's category is a category or `null`, never a group (CAT-1, CAT-3).
- Categories have exactly two levels (CAT-2).
- Group names are unique per user (CAT-9).
- Deleting a category never leaves a transaction, payee or rule pointing to it (CAT-5, CAT-6).
- Nothing changes before the user confirms the deletion preview (CAT-4).
- A category deletion never touches another user's data (CAT-7).
- Category names are unique per group, ignoring case (CAT-12).
- Income and spending never mix: no move and no deletion carries a category's contents across the line (CAT-13).
- A deletion without a target never leaves a rule setting "uncategorised" (CAT-6).

## Edge cases

- **A category with nothing pointing to it:** the preview shows all counts at zero; confirming deletes it.
- **A crossing transfer in the deleted category** moves like any transaction; with no target it becomes an uncategorised transfer that still crosses the boundary.
- **Budget amounts of the target** are not changed by the deletion: the deleted category's amounts are dropped, never added to the target's (D-29).
- **A renamed bootstrap category** keeps its `systemKey` (CAT-8).
- **A rule whose only action set the deleted category** stays, with no actions, and is shown as such (CAT-6).
- **The last income group deleted:** allowed; until a new one exists, there is no income for the budget's percentages and the analytics (D-74).

## Divergences from Actual Budget

1. **Budget amounts are deleted, not carried over.** When a category is deleted, Actual Budget moves its budget amounts to the target category along with its transactions; here they are deleted, with a warning in the preview, because adding them to the target's own plan may not be wanted (D-29).
2. **Payee defaults and rule actions move too.** Actual Budget asks for a target only for the transactions and the budget; here everything that points to the category follows the same target, so no rule or payee is left pointing nowhere (D-29).
3. **A deletion preview with counts** before anything changes (D-29).
4. **Several income groups, none protected.** Actual Budget has exactly one income group, which cannot be deleted; here any group can be an income group, and any can be deleted (D-28, D-74).

## Examples

### CAT-1 · A transaction can only be on a category

- **Given** group "Home" containing category "Utilities"
- **When** a transaction of −60.00 is assigned to "Home › Utilities"
- **Then** it is saved with that category
- **When** a transaction of −40.00 is assigned to the group "Home"
- **Then** it is rejected

### CAT-2 · No third level

- **Given** category "Home › Utilities"
- **When** the user tries to create a category inside "Utilities"
- **Then** it is rejected: a category belongs to a group and contains nothing

### CAT-3 · Uncategorised is the absence of a category

- **Given** no category called "Uncategorized" exists
- **When** a transaction of −25.00 is saved without a category
- **Then** its category is `null`
- **And** it appears in the uncategorised view

### CAT-4 · Deletion preview

- **Given** category "Restaurants" with 230 transactions, monthly budgets for 12 months, 8 payees whose default is "Restaurants" and 3 rules that set "Restaurants"
- **When** the user asks to delete "Restaurants" with target "Expenses"
- **Then** the preview shows 230 transactions, 12 monthly budgets, 8 payees and 3 rules
- **And** warns that the 12 monthly budgets will be deleted
- **And** nothing has changed

### CAT-5 · Deletion with a target

- **Given** the situation of CAT-4
- **When** the user confirms the deletion with target "Expenses"
- **Then** the 230 transactions have category "Expenses"
- **And** the 8 payees have default category "Expenses"
- **And** the 3 rules set "Expenses"
- **And** the 12 monthly budgets of "Restaurants" are deleted and the monthly budgets of "Expenses" are unchanged
- **And** "Restaurants" no longer exists

### CAT-6 · Deletion without a target

- **Given** the situation of CAT-4
- **When** the user confirms the deletion with no target
- **Then** the 230 transactions are uncategorised
- **And** the 8 payees have no default category
- **And** the 3 rules no longer have a "set category" action; a rule that had only that action is kept and shown as having no actions
- **And** no rule sets "uncategorised"
- **And** the 12 monthly budgets are deleted

### CAT-7 · Deletion is scoped to the user

- **Given** users A and B each have a category "Restaurants" with transactions
- **When** user A deletes "Restaurants" with no target
- **Then** user B's "Restaurants" and its transactions are unchanged

### CAT-8 · A bootstrap category can be renamed and deleted

- **Given** the bootstrap category "Groceries" with `systemKey` `GROCERIES`
- **When** the user renames it "Food shopping"
- **Then** it keeps the `systemKey` `GROCERIES`
- **When** the user deletes it
- **Then** it is deleted like any other category

### CAT-9 · Duplicate group names

- **Given** user A has group "Home"
- **When** user A creates another group "Home"
- **Then** it is rejected

### CAT-10 · Moving a category to another group

- **Given** category "Home › Internet" with 12 transactions and a budget for November 2026
- **When** the user moves it to group "Bills"
- **Then** it is "Bills › Internet" with the same 12 transactions and the same November budget

### CAT-11 · Deleting a group with categories

- **Given** group "Car" containing "Fuel" (40 transactions) and "Insurance" (2 transactions)
- **When** the user deletes "Car" with target "Expenses"
- **Then** the preview shows 42 transactions, and the counts of budgets, payees and rules of both categories
- **When** the user confirms
- **Then** the 42 transactions have category "Expenses", "Fuel", "Insurance" and "Car" no longer exist

### CAT-12 · Category names are unique per group

- **Given** groups "Home" and "Car", and category "Home › Other"
- **When** the user creates "Car › Other"
- **Then** it is created
- **When** the user creates "Home › other"
- **Then** it is rejected, because "Home" already has "Other"

### CAT-13 · Income and spending do not mix

- **Given** income group "Income" with category "Salary", and spending group "Home" with category "Rent"
- **When** the user moves "Salary" to "Home"
- **Then** it is rejected
- **When** the user deletes "Salary" with target "Home › Rent"
- **Then** it is rejected, because the target is a spending category

### CAT-14 · Income is read from income groups, not from the sign

- **Given** income group "Income" with categories "Salary" and "Other income", and spending group "Spending" with category "Shopping"
- **When** in November 2026 the user records +2,000.00 on "Salary", +100.00 on "Other income", −30.00 and a refund of +30.00 on "Shopping"
- **Then** November's income is 2,100.00
- **And** November's spending on "Shopping" is 0.00
