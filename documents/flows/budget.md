# Budget

The monthly tracking budget: an amount planned for each category in each month, fixed or a percentage of the previous month's income; the month's spending is tracked against it, and nothing carries over to the next month. Convenience commands fill many months or categories at once. Models and fields are defined in the [data model](../domain/data-model.md); what counts as spending and income is defined once in the [analytics flow](analytics.md#what-counts).

**Decisions:** D-09 (tracking budget first; envelope budgeting may come later, [ADR-0006](../adr/0006-monthly-tracking-budget.md)), D-17 (amounts per category per month, a percentage of the previous month's income, convenience commands), D-25 and D-74 (spending and income as in the analytics), D-27 (budget amounts on categories, never on groups), D-29 (budget amounts deleted with their category, with a warning), D-30 (months are the months of calendar dates), D-48 (every query scoped to the user), D-59 (amounts in cents), D-101 (a live percentage; limits), D-102 (rounding), D-103 (budget amounts on income categories), D-104 (statuses; no row differs from 0), D-105 (convenience commands).

## Behaviour

### Monthly amounts

A budget amount is a `MonthlyBudget` row for one category and one month (`MonthlyBudget.categoryId`, `MonthlyBudget.month`, the first day of the month). There is at most one per category and month (D-17). It is either:

- **a fixed amount**, `MonthlyBudget.amount`, in cents, zero or more; or
- **a percentage of the previous month's income**, `MonthlyBudget.percentOfIncome`, in hundredths of a percent (12.5% is `1250`), from 0.01% to 100% ([below](#percentage-of-the-previous-months-income)).

A negative amount, a percentage of 0 or above 100%, or both or neither of the two, is rejected (D-101, BUD-13).

Budget amounts belong to categories, never to groups (D-27): a group's budget is the sum of its categories' amounts. Any month can have amounts, past or future, so "Gifts" can be 50.00 every month and 400.00 in December, and "Holidays" 0.00 except 1,500.00 in August (BUD-2).

Income categories have budget amounts too, as in Actual Budget's tracking budget: on an income category the amount is the income expected in that month (D-103, BUD-8).

### Percentage of the previous month's income

An amount set as a percentage is computed on the income of the month before (D-17, [ADR-0006](../adr/0006-monthly-tracking-budget.md)): November's "Savings" at 10% is 10% of October's income. Income is the analytics income of that month: the transactions that count in the categories of income groups, plus uncategorised positive amounts (D-74, D-97, [analytics](analytics.md#income-or-spending)). With no income in the previous month, or a negative one, the amount is 0.00.

The percentage is what is stored; the amount is computed from it whenever it is read (D-101). It is therefore derived, like a balance (D-11): a salary imported on 5 November raises November's amount from that moment, and a correction to October made in December changes November's amount too (BUD-6).

### Rounding

An amount computed from a percentage or from an average is rounded to the cent, with halves rounded up, as Actual Budget rounds cents (D-59, D-102): 12.5% of 1,234.57 is 154.32125, budgeted as 154.32 (BUD-7).

Shares such as "112.5% used" are never rounded where they decide something: a status compares exact integers (spent × 100 against budgeted × 80). A share shown to the user is rounded to one decimal, for display only.

### Spent

The spending of a category in a month is its spending by the [analytics rule](analytics.md#what-counts): the transactions that count, dated in that month, with the sign reversed. A refund lowers it (D-74, CAT-14). A transfer between on-budget accounts never uses a budget; a transfer to an off-budget account, with a category on its on-budget side, does (D-25, D-71, BUD-5).

Uncategorised transactions belong to no category, so no budget amount covers them; the budget analysis shows them on a line of their own (D-28).

### Budget analysis

For a month, each spending category with its budgeted amount, its spending, what remains (budgeted minus spent, negative when overspent), the share used (spent divided by budgeted) and a status (D-104):

| Status | When |
| --- | --- |
| `OK` | spent is below 80% of budgeted; with a budget of 0.00, nothing was spent |
| `WARNING` | spent is from 80% to 100% of budgeted, both included |
| `OVER` | spent is above budgeted; with a budget of 0.00, anything spent |
| `NO_BUDGET` | the category has no budget amount in that month: only its spending is shown |

A category without a row is different from a category with 0.00: "Holidays" at 0.00 in March is `OVER` as soon as something is spent on it, while a category never budgeted only shows what it spent (BUD-9). The statuses are computed when the analysis is read; there are no notifications in the MVP.

Each income category shows its expected and its received income, with no status (D-103). Groups show the sums of their categories, and the month shows:

- budgeted income and received income;
- budgeted spending and spending;
- projected savings, budgeted income minus budgeted spending, and real savings, income minus spending (BUD-8).

### Nothing carries over

Each month starts from its own amounts. What is left in a category at the end of the month, or what was overspent, does not move to the next month (D-09, [ADR-0006](../adr/0006-monthly-tracking-budget.md), BUD-4).

### Convenience commands

Commands that write many amounts at once (D-17), as in Actual Budget (D-105). They overwrite the amounts of the categories they write, never remove one, and never create a budget of 0.00 where there was none: a category without a row in the month copied from is left as it is in the month copied to, because no row means no budget (D-104), not 0.

On a whole month, for every category:

- **Copy the previous month:** every category with a row in the previous month gets that amount, or that percentage as a percentage. A category without a row in the previous month keeps what it has (BUD-10).
- **Set to zero:** every category with a row gets 0.00; a category without a row stays without one.
- **Average of the last 3, 6 or 12 months:** each category gets the average of what it actually spent (received, for an income category) in the months before the chosen one, counted from the category's first transaction, rounded as [above](#rounding) (BUD-11). A category with no transaction in those months gets 0.00 if it has a row, and stays without a row otherwise (BUD-14).

On one category:

- **Copy the previous month** and **average of the last 3, 6 or 12 months**, as above, for that category only.
- **Copy until the end of the year:** the category's amount or percentage of the chosen month is written to every later month of the same calendar year (BUD-12). Without a row in the chosen month, nothing is written.

### Categories that change

- **Deleting a category** deletes its budget amounts; the deletion preview counts them and warns (D-29, CAT-4).
- **Moving a category to another group** keeps its budget amounts; they now add up in the new group.

### Envelope budgeting later

The model must not rule out envelope budgeting (D-09). Amounts per category per month are what it needs; adding it later means adding the carry-over and the "to budget" amount, not a new model ([ADR-0006](../adr/0006-monthly-tracking-budget.md)).

## Invariants

- A category has at most one budget amount per month, and a group never has one (BUD-2).
- A budget amount is either a fixed amount of zero or more, or a percentage from 0.01% to 100% (BUD-13).
- Spending against a budget is computed with the analytics rule: transfers within the budget, starting balances and adjustments never use it, and refunds lower it (BUD-1, BUD-5, ANL-2).
- A percentage is computed on the previous month's income whenever it is read (BUD-3, BUD-6).
- Nothing carries over from one month to the next (BUD-4).

## Edge cases

- **No income group:** income comes only from uncategorised positive amounts; without them every percentage computes to 0.00 (D-74, D-97).
- **Spending in a category of a month with no budget amount:** `NO_BUDGET`, shown with its spending (BUD-9).
- **Refunds larger than the purchases:** spending is negative and the status is `OK`.
- **Averages over a category created last month:** only the months since its first transaction count (BUD-11).
- **A month in the future:** amounts can be set; spending is what is already dated in that month.
- **A category deleted:** its budget amounts go with it, after the warning in the preview (D-29).

## Divergences from Actual Budget

1. **No carry-over.** Actual Budget's tracking budget has an optional per-category carry-over, off by default; here nothing carries over (D-09, [ADR-0006](../adr/0006-monthly-tracking-budget.md)).
2. **Percentage of income as a budget amount.** Actual Budget offers a percentage of income only through experimental goal templates (`#template 10% of previous all income`); here it is a kind of budget amount (D-17).
3. **Income from income groups.** Actual Budget has one income group; here income is read from every income group (D-74).
4. **Statuses, and no row is not 0.** Actual Budget has no warning at 80%, and every category has a budget amount, 0 by default; here a status is given from 80% and a category without a row has no budget (D-104). For the same reason, copying a month never removes a budget amount that the month copied from does not have (D-105).

## Examples

### BUD-1 · Spending tracked against the budget

- **Given** "Groceries" has a budget of 400.00 for October 2026
- **When** 450.00 is spent on "Groceries" in October
- **Then** the analysis for October shows budgeted 400.00, spent 450.00, remaining −50.00, used 112.5%

### BUD-2 · Different amounts in different months

- **Given** "Gifts" is set to 50.00 for every month of 2026 and to 400.00 for December
- **And** "Holidays" is set to 0.00 for every month of 2026 and to 1,500.00 for August
- **When** the budget of 2026 is read
- **Then** "Gifts" is 50.00 from January to November and 400.00 in December
- **And** "Holidays" is 1,500.00 in August and 0.00 in every other month

### BUD-3 · A percentage of the previous month's income

- **Given** October 2026's income is 2,500.00
- **When** "Savings" is set to 10% of the previous month's income for November 2026
- **Then** "Savings" is budgeted 250.00 for November

### BUD-4 · Nothing carries over

- **Given** "Groceries" has 400.00 for October and for November 2026
- **And** 350.00 was spent on "Groceries" in October
- **When** the analysis for November is read, with nothing spent yet
- **Then** "Groceries" has 400.00 remaining, not 450.00

### BUD-5 · Transfers and the budget

- **Given** on-budget accounts "Checking" and "Deposit", and off-budget account "Broker"
- **And** "Savings › Investments" has a budget of 300.00 for October 2026
- **When** 500.00 is transferred from "Checking" to "Deposit", and 300.00 from "Checking" to "Broker" with "Savings › Investments" on the "Checking" side
- **Then** "Savings › Investments" has spent 300.00 of 300.00
- **And** the transfer to "Deposit" uses no budget

### BUD-6 · A percentage follows a late import

- **Given** "Savings" is set to 10% of the previous month's income for November 2026
- **And** on 2026-11-02 October's income is 100.00
- **When** October's salary of +2,500.00 is imported on 2026-11-05
- **Then** "Savings" was budgeted 10.00 on 2026-11-02 and is budgeted 260.00 from 2026-11-05
- **And** the stored row still holds the percentage, not an amount

### BUD-7 · Rounding a percentage

- **Given** October 2026's income is 1,234.57
- **When** "Savings" is set to 12.5% of the previous month's income for November 2026
- **Then** `MonthlyBudget.percentOfIncome` is `1250`
- **And** "Savings" is budgeted 154.32 for November

### BUD-8 · Expected income and savings

- **Given** income category "Salary" budgeted 2,500.00 for November 2026, and spending categories budgeted 2,000.00 in total
- **When** 2,300.00 is received on "Salary" and 2,100.00 is spent in November
- **Then** "Salary" shows expected 2,500.00 and received 2,300.00, with no status
- **And** November shows projected savings of 500.00 and real savings of 200.00

### BUD-9 · Statuses

- **Given** "Groceries" has a budget of 400.00 for March 2026, "Holidays" a budget of 0.00, and "Restaurants" no budget amount
- **When** spending on "Groceries" in March is 300.00, then 320.00, then 400.00, then 401.00
- **Then** its status is `OK`, then `WARNING`, then `WARNING`, then `OVER`
- **When** 100.00 is spent on "Holidays" and 80.00 on "Restaurants"
- **Then** "Holidays" is `OVER` and "Restaurants" is `NO_BUDGET` with 80.00 spent
- **And** before anything was spent on it, "Holidays" was `OK`

### BUD-10 · Copy the previous month

- **Given** October 2026 has "Groceries" 380.00, "Gifts" 50.00, "Holidays" 0.00 and "Savings" 10% of income, and "Restaurants" no row
- **And** November 2026 has "Groceries" 400.00 and "Restaurants" 150.00
- **When** the user copies the previous month into November
- **Then** November has "Groceries" 380.00, "Gifts" 50.00, "Holidays" 0.00 and "Savings" 10% of income
- **And** "Restaurants" keeps 150.00 in November, because it has no row in October

### BUD-11 · Average of the last three months

- **Given** spending on "Groceries" of 420.00 in August, 390.00 in September and 450.00 in October 2026
- **And** category "Gym", created in October 2026, with 40.00 spent in October
- **When** the user sets November 2026 to the average of the last three months
- **Then** "Groceries" is budgeted 420.00 and "Gym" 40.00 for November

### BUD-12 · Copy until the end of the year

- **Given** "Gifts" has 400.00 in October 2026, and November and December have other amounts
- **When** the user copies "Gifts" of October until the end of the year
- **Then** "Gifts" is 400.00 in November and December 2026
- **And** January 2027 does not change

### BUD-13 · Invalid budget amounts

- **Given** spending category "Groceries"
- **When** the user sets −50.00, a percentage of 0%, or a percentage of 120% for November 2026
- **Then** each is rejected and nothing is saved

### BUD-14 · Commands never create a zero budget

- **Given** in November 2026 "Groceries" has 400.00, "Gifts" has 50.00 and "Gym" has no row
- **And** nothing was spent on "Gifts" or "Gym" from August to October 2026
- **When** the user sets November to the average of the last three months
- **Then** "Gifts" is 0.00 and "Gym" still has no row
- **When** the user sets November to zero
- **Then** "Groceries" and "Gifts" are 0.00 and "Gym" still has no row
