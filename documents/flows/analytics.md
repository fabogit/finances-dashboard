# Analytics

What counts as income, as spending and towards the Net Worth, and the views built on that rule: the summary of a period, spending by category, the monthly trend, the Net Worth and its history, the 50/30/20 view, and the input of the forecast. The rule is written once, here, and every view, the budget included, applies it. Models and fields are defined in the [data model](../domain/data-model.md); the comparison of spending with the monthly budget is in the [budget flow](budget.md#budget-analysis).

**Decisions:** D-07 (EUR only; investments and debts in the Net Worth), D-11 (balances derived from transactions, [ADR-0003](../adr/0003-derived-balances.md)), D-25 (what counts, by transaction kind, [ADR-0008](../adr/0008-transaction-kind.md)), D-28 (uncategorised is a separate entry), D-30 (months are the months of calendar dates), D-35 (the forecast is kept, its input filtered by kind), D-48 (every query scoped to the user), D-49 (forecast outcomes without a result), D-59 (amounts in cents), D-62 (50/30/20 classification), D-66 (the current balance stops at today), D-69 and D-71 (which transactions carry a category), D-74 (income is read from income groups; refunds lower spending), D-96 (off-budget transactions stay out of income and spending), D-97 (uncategorised transactions count by sign), D-98 (the Net Worth history), D-99 (the 50/30/20 view), D-100 (the forecast splits by sign).

## Behaviour

### What counts

Every transaction counts towards the Net Worth. Only some count as income or spending (D-25):

| Transaction | Income and spending | Net Worth |
| --- | --- | --- |
| `REGULAR` on an on-budget account | yes, by its category ([below](#income-or-spending)) | yes |
| `REGULAR` on an off-budget account | no, and it has no category (D-96) | yes |
| `TRANSFER` between two on-budget accounts, or two off-budget accounts | no (D-25, D-28) | yes; the two sides add up to zero |
| `TRANSFER` that crosses the on/off-budget boundary, on-budget side | yes, by its category (D-25, D-71) | yes |
| `TRANSFER` that crosses the boundary, off-budget side | no: the movement counts once, on the on-budget side (D-71) | yes |
| `STARTING_BALANCE` | no (D-25) | yes |
| `ADJUSTMENT` | no (D-25); converted to `REGULAR`, it counts from then on (D-69) | yes |

The rule reads `Transaction.kind`, `Account.isOnBudget` and the transaction's category, nothing else: no category name, payee or description decides whether a transaction counts.

Off-budget accounts are followed for the Net Worth only, as in Actual Budget (D-96): a dividend on an investment account or interest charged on a loan account moves the Net Worth, not income or spending (ANL-8). To count a dividend as income, the money is moved to an on-budget account with a transfer whose on-budget side carries an income category (D-71).

### Income or spending

A transaction that counts is income or spending according to the group of its category (D-74):

- **A category of an income group** (`CategoryGroup.isIncome` = `true`): income, with its sign. A salary of +2,500.00 adds 2,500.00; a correction of −100.00 on the same category lowers income by 100.00.
- **A category of a spending group:** spending, with the sign reversed. A purchase of −450.00 adds 450.00; a refund of +30.00 lowers spending by 30.00 and is not income (D-74, CAT-14).
- **No category:** by its sign, under an "Uncategorized" entry of its own on each side (D-28, D-97): a negative amount is spending, a positive amount is income. For a transfer that crosses the boundary this is the direction of D-25: money leaving the budget is spending, money entering it is income. The totals are therefore complete right after an import, before anything is categorised (ANL-9).

Spending is therefore the net of purchases and refunds, and income the net of what came in and its corrections. A refund that is still uncategorised counts as income until it is categorised. A category whose refunds exceed its purchases in a period has negative spending in that period.

### Periods and months

Every view is computed on `Transaction.date`, a calendar date: a transaction belongs to the month of its date, with no time zone conversion, wherever the server runs (D-30, DM-1). A period is a range of calendar dates, both ends included. "This month" is the month of today in the user's time zone (`User.timeZone`).

A transaction dated in the future counts in the period that contains its date, like any other; only the current balance stops at today (D-66, BAL-10).

All amounts are in cents and every total is an exact integer sum (D-59). The totals are computed by the database, never by loading the transactions into memory.

### Summary

For a period: income, spending, and the difference between them (net). The savings rate is net divided by income, when income is greater than zero; with no income it is not given.

### Spending by category

For a period: the spending of each category, grouped by category group, and its share of total spending. Uncategorised transactions are one entry of their own, never a category (D-28, CAT-3). Income categories are listed the same way, apart from spending.

### Monthly trend

For a range of months: income, spending and net of each month, with the same rule as the summary.

### Net Worth

The Net Worth at a date is the sum of the balances of all the user's accounts at that date, on-budget and off-budget, of every transaction kind, in EUR (D-07, D-11). A debt account lowers it by its negative balance (BAL-8). The current Net Worth is the Net Worth at today; transactions dated in the future count from their own date (D-66).

A closed account keeps its past balances, so the past Net Worth does not change when an account is closed (BAL-9); after its closing transfer its balance is zero. A forced deletion removes the account and its transactions, and changes the past Net Worth (D-80, BAL-12).

**History.** One point at the end of each month of the period, and a last point at today instead of the end of the current month, so a transaction dated later this month does not count yet (D-66, D-98). Each point gives the total and its breakdown by `Account.type` (D-61): checking, savings, investments, property, loans and so on (ANL-10). Other intervals (day, week, year) can be added later as readings of the same cumulative sum ([balances](balances.md#balance-at-a-date)).

### 50/30/20

For a period, by default a month, the view splits income by the 50/30/20 classification of the categories, `Category.expenseType` (D-62, D-99):

| Line | Amount | Target |
| --- | --- | --- |
| Needs | the spending of `NEEDS` categories | 50% of income |
| Wants | the spending of `WANTS` categories | 30% of income |
| Savings | income − needs − wants − not classified | 20% of income |
| Not classified | the spending of categories without a classification, and of uncategorised transactions | — |

Each line shows its amount and its share of income. The lines add up to income, so the view reads as "where every euro went". Savings are everything that was not spent: money moved to an investment account and money left on the accounts alike. They can be negative in a month that spent more than came in. Savings show, as a detail, how much of them went to `SAVINGS` categories (ANL-11). With no income in the period, the shares are not given.

### Forecast input

The forecast is kept with its algorithm (D-35, [science contract](../architecture/science-contract.md#post-forecast)). The core sends the science service the transactions that count as income or spending, by the rule above, dated in the 18 months before today; on-budget transfers, starting balances, adjustments and off-budget transactions are left out.

The science service splits income from expenses by the sign of the amount, as it does today (D-100). Where the summary follows the category group, the forecast can differ: a refund lowers spending in the summary and is income in the forecast; a negative correction of a salary lowers income in the summary and is an expense in the forecast (ANL-12). The difference is accepted until the forecast is redesigned (#77, post-MVP).

Outcomes (D-49):

- **No transaction counts in the window:** `422` with `error: "INSUFFICIENT_DATA"`, without calling the science service.
- **The science service finds the history too short:** `422` with `error: "INSUFFICIENT_DATA"`; the core translates it.
- **The science service is unavailable, times out or fails:** `503`, `504` or `502`, as in the [science contract](../architecture/science-contract.md#failure-handling). Every other view keeps working: none of them depends on the science service ([ADR-0005](../adr/0005-python-science-service-rest.md)).

## Invariants

- Every transaction counts towards the Net Worth; only `REGULAR` transactions on on-budget accounts and the on-budget side of transfers that cross the boundary count as income or spending (ANL-1, ANL-8).
- A transfer within the budget, a starting balance and an adjustment never count as income or spending (ANL-1, BAL-5).
- Income and spending follow the group of the category, not the sign: a refund lowers spending (ANL-2, CAT-14). Only an uncategorised transaction counts by its sign (ANL-9).
- The 50/30/20 lines add up to income (ANL-11).
- A transaction belongs to the month of its calendar date (ANL-3, DM-1).
- Totals are exact sums of cents (DM-3).
- The forecast never receives a transaction that does not count as income or spending (ANL-4).

## Edge cases

- **Refunds larger than the purchases in a period:** the category's spending in that period is negative; it is shown as it is.
- **No income group:** income comes only from uncategorised positive amounts; every counted transaction with a category is spending (D-74, D-97).
- **No income in a period:** the savings rate and the 50/30/20 shares are not given; the amounts are.
- **An account opened during the period:** its starting balance moves the Net Worth, not income (ANL-1, BAL-5).
- **A back-dated import or an edit:** every view is computed from the transactions when it is asked for, so it is right at once; nothing is stored to refresh (D-11).
- **The science service is down:** only the forecast fails, with `503` (ANL-6).

## Divergences from Actual Budget

1. **What counts is read from the transaction kind.** Actual Budget recognises transfers by their transfer payee and has no kind for starting balances and adjustments; here `Transaction.kind` decides (D-25, [ADR-0008](../adr/0008-transaction-kind.md)).
2. **Income groups.** Actual Budget has one protected income group; here a user can have several, and income is read from all of them (D-74).
3. **The 50/30/20 view.** Actual Budget has no such view; here it reads `Category.expenseType` (D-62, D-99).
4. **Net Worth intervals.** Actual Budget offers daily, weekly, monthly and yearly points; the MVP offers month-end points only (D-98).
5. **Uncategorised transactions.** Actual Budget's cash flow report splits by sign, like here, but its spending report counts every uncategorised transaction as spending; here an uncategorised positive amount is income (D-97).

## Examples

### ANL-1 · What counts in October

- **Given** on-budget accounts "Checking" and "Deposit", and off-budget account "Broker"
- **When** in October 2026:
  - +2,500.00 on "Checking", "Income › Salary";
  - −1,800.00 on "Checking", on spending categories;
  - a transfer of 500.00 from "Checking" to "Deposit";
  - a transfer of 300.00 from "Checking" to "Broker", with "Savings › Investments" on the "Checking" side;
  - a revaluation of "Broker" by +350.00, an `ADJUSTMENT`;
  - account "Card", on-budget, opened with a starting balance of +200.00
- **Then** October's income is 2,500.00 and October's spending is 2,100.00
- **And** the transfer to "Deposit", the revaluation and the starting balance count only towards the Net Worth
- **And** the Net Worth at the end of October is 1,250.00 higher than at the end of September

### ANL-2 · A refund lowers spending

- **Given** spending category "Shopping" with −120.00 in November 2026
- **When** a refund of +30.00 on "Shopping" dated 2026-11-20 is saved
- **Then** November's spending on "Shopping" is 90.00
- **And** November's income does not change

### ANL-3 · The month of a payment just after midnight

- **Given** the user's time zone is `Europe/Rome`
- **And** a payment of −40.00 on "Groceries" dated 2026-11-01 at 00:30
- **When** the monthly trend and the spending by category are asked for
- **Then** the payment counts in November 2026 in both, never in October

### ANL-4 · The forecast input is filtered by kind

- **Given** in the last 18 months the user has `REGULAR` transactions, transfers between on-budget accounts, a transfer to an off-budget account with a category, starting balances and adjustments
- **When** the forecast is asked for
- **Then** the science service receives the `REGULAR` transactions and the on-budget side of the transfer to the off-budget account
- **And** it receives no transfer between on-budget accounts, no starting balance and no adjustment

### ANL-5 · A forecast without history

- **Given** no transaction counts as income or spending in the 18 months before today
- **When** the forecast is asked for
- **Then** the answer is `422` with `error: "INSUFFICIENT_DATA"`
- **And** the science service is not called

### ANL-6 · A forecast with the science service down

- **Given** the science service is stopped
- **When** the forecast is asked for
- **Then** the answer is `503` with `error: "SCIENCE_UNAVAILABLE"`
- **And** the summary, the spending by category, the trend and the Net Worth answer normally

### ANL-7 · The Net Worth at the end of a month

- **Given** on 2026-10-31 "Checking" (on-budget) has 3,000.00, "Broker" (off-budget) 10,000.00 and "Mortgage" (off-budget, `LOAN`) −150,000.00
- **When** the Net Worth at 2026-10-31 is asked for
- **Then** it is −137,000.00

### ANL-8 · Off-budget transactions are not income or spending

- **Given** off-budget account "Broker" and off-budget account "Mortgage", a `LOAN`
- **When** in November 2026 a dividend of +50.00 is recorded on "Broker" and interest of −300.00 on "Mortgage", both `REGULAR`
- **Then** neither has a category
- **And** November's income and spending do not change
- **And** the Net Worth at the end of November is 250.00 lower than without them

### ANL-9 · Uncategorised transactions count by sign

- **Given** on-budget account "Checking" and off-budget account "Broker"
- **When** in November 2026, on "Checking", −50.00, −20.00 and +100.00 are imported without a category, and 300.00 is transferred to "Broker" without a category
- **Then** November's spending includes 370.00 under "Uncategorized"
- **And** November's income includes 100.00 under "Uncategorized"

### ANL-10 · The Net Worth history

- **Given** today is 2026-11-12 in the user's time zone
- **And** "Checking" (`CHECKING`) and "Broker" (`INVESTMENT`) opened in March 2025, and a payment of −100.00 on "Checking" dated 2026-11-20
- **When** the Net Worth history from March 2025 is asked for
- **Then** it has one point at the end of each month from March 2025 to October 2026 and a last point at 2026-11-12
- **And** each point gives the total and the amounts of `CHECKING` and `INVESTMENT`
- **And** the last point does not include the payment of 2026-11-20

### ANL-11 · The 50/30/20 view

- **Given** in October 2026 income of 2,500.00
- **And** spending of 800.00 on "Rent" and 450.00 on "Groceries" (`NEEDS`), 200.00 on "Restaurants" and 150.00 on "Travel" (`WANTS`), 300.00 on "Investments" (`SAVINGS`) and 100.00 on "Other" (not classified)
- **When** the 50/30/20 view of October is asked for
- **Then** needs are 1,250.00 (50%), wants 350.00 (14%), savings 800.00 (32%), of which 300.00 in `SAVINGS` categories, and not classified 100.00 (4%)
- **And** the four lines add up to 2,500.00

### ANL-12 · The forecast splits by sign

- **Given** spending category "Shopping" with a refund of +30.00 in the last 18 months
- **When** the forecast is asked for
- **Then** the science service receives the refund as +30.00, which it counts as income
- **And** the summary of that month counts it as 30.00 less spending on "Shopping"
