# Balances

How an account opens, how its balance and its history are computed, how it is reconciled with the bank, how the value of an investment changes, and how an account is closed. The balance is never stored: it is always the sum of the account's transactions. Models and fields are defined in the [data model](../domain/data-model.md).

**Decisions:** D-07 (investments as off-budget accounts with value adjustments; EUR only), D-11 (balances derived from transactions, starting balance as a transaction, [ADR-0003](../adr/0003-derived-balances.md)), D-12 (starting balance and reconcile in the MVP), D-25 (transaction kinds, [ADR-0008](../adr/0008-transaction-kind.md)), D-30 (calendar dates; the user's time zone decides "today"), D-48 (every query scoped to the user), D-59 (amounts in cents), D-61 (account types), D-63, D-80 and D-81 (closing, deleting and reopening an account), D-64 (on-budget fixed at creation), D-65 (starting balance rules), D-66 (current balance stops at today), D-67 (reconciliation and revaluation as one operation), D-68 (no cleared state in the MVP), D-69 (no category on starting balances and adjustments; an adjustment can become a regular transaction), D-91 (rules that reference a deleted account), D-96 (off-budget transactions have no category and stay out of income and spending), D-106 (an account with a savings goal cannot be deleted).

## Behaviour

### Opening an account

The user creates an account with a name, a type, on-budget or off-budget (`Account.isOnBudget`), a starting balance and the date it applies to. The account and its `STARTING_BALANCE` transaction are written together, in one database transaction. The starting balance has no category and no payee: it is neither income nor spending (D-25, D-69).

Whether the account is on-budget is chosen here and never changes: it decides how past transfers and analytics count. To change it, the user closes the account and opens a new one (D-64).

Rules of the starting balance (D-65):

- every account has exactly one, created with the account, also when it is 0: its date is the date the account opens;
- its amount and its date can be edited; it is never deleted on its own, only with its account;
- a transaction dated before it is rejected, because the starting balance already contains every movement before its date. In an import, such a row is flagged in the preview. To record earlier movements, the user first moves the starting balance back.

### Balance at a date

The balance of an account at a date `d` is the sum of `Transaction.amount` over the account's transactions with `Transaction.date` ≤ `d`, of every kind. The history is the same sum taken at each date (a cumulative sum by date, computed by the database); any granularity, daily or month-end, is a reading of the same sum.

The current balance is the balance at today's date in the user's time zone (D-30). Transactions dated in the future do not count in it: they are shown apart, as upcoming, and count from their own date (D-66). The current balance therefore matches what the bank shows today.

Because nothing is stored, a back-dated import, an edit or a deletion changes the balance from its date onwards, and only from there. There are no deltas to apply, so two concurrent edits cannot apply one twice.

### Setting the balance at a date

Reconciling an account with the bank and changing the value of an investment are one operation: the user sets the balance of an account at a date (D-67).

1. **Preview.** The user enters the balance and the date, which defaults to today. The system compares it with the derived balance at that date and shows the difference. Nothing is written yet.
2. **Confirm.** If they differ, the difference is recorded as an `ADJUSTMENT` on the account, dated on the date the user gave. If they match, nothing is written.

The two uses:

- **Reconciling with the bank.** The user enters the balance on the bank statement at the statement's date. A reconciliation done late, such as at 10 November for the end of October, still dates the adjustment at the end of October, so October's balance is right.
- **Changing the value of an investment.** An off-budget account that holds an investment, a property or a vehicle has no transaction for every price change; the user enters its current value (D-07, D-11).

Adjustments move the balance and the Net Worth, never income or spending, and have no category (D-25, D-69). If the user finds out what an adjustment was, such as forgotten bank fees, they can convert it into a `REGULAR` transaction with a category; from then on it counts as spending (D-69). On an off-budget account the converted transaction has no category and stays out of income and spending, like every transaction of an off-budget account (D-96, [analytics](analytics.md#what-counts)).

Transactions have no cleared or reconciled state in the MVP: reconciliation compares the derived balance at a date, and nothing is locked (D-68). A movement the user recorded by hand that the bank has not booked yet by the reconciliation date makes the difference wrong. The preview shows the difference before anything is written, so the user can fix that transaction's date first.

### Debt accounts

A mortgage or a loan is an off-budget account of type `LOAN` with a negative balance: its starting balance is the debt, with a minus sign, and each repayment is a transfer into it. Its balance moves towards zero and lowers the Net Worth while negative.

### Closing and deleting an account

As in Actual Budget (D-63, D-80, D-81):

- **An account without transactions** other than its starting balance is deleted.
- **An account with transactions is closed.** If its balance is not zero, the user chooses another account and the remaining balance is moved there with a transfer dated today, with the notes "Closing account". If that transfer crosses the on/off-budget boundary, the user can give its on-budget side a category, and it counts as spending or income like any such transfer ([transfers flow](transfers.md#category)). `Account.closedAt` is set, no new transactions are accepted on the account, and its history stays in the balances and in the Net Worth.
- **A closed account can be reopened:** `Account.closedAt` goes back to `null`, its history is untouched, and it accepts transactions again.
- **A forced deletion** is a separate action, shown with a warning that the account and all its transactions are deleted and that the past Net Worth changes. It removes the account and all its transactions, in one database transaction. The counterparts of its transfers, on other accounts, become `REGULAR` transactions with no `transferId`, so the other balances do not change.

When an account is deleted, with or without a forced deletion, the rules that reference it change as for a deleted payee: a "transfer to" action is removed, and a condition on the account is kept and shown as "deleted account" (D-91, [rules and payees flow](rules-payees.md#what-rules-reference)). A closed account keeps its rules.

An account that a savings goal uses, archived or not, cannot be deleted, with or without force, until the goal is moved to another account or deleted (D-106, [goals flow](goals.md#when-the-account-closes)). Closing it is allowed.

### On-budget and off-budget

`Account.isOnBudget` decides whether the account's transactions count as income and spending and whether a transfer to or from it crosses the budget boundary (D-25); the rules are in the [transfers flow](transfers.md). Net Worth counts every account, on-budget and off-budget.

## Invariants

- The balance at a date is the sum of the transactions dated up to that date, whatever day they were written (BAL-1, BAL-7).
- Starting balances and adjustments move the balance and the Net Worth, never income or spending, and have no category (BAL-2, BAL-5, BAL-11).
- Every account has exactly one starting balance, and no transaction is dated before it (BAL-5, BAL-6).
- The current balance includes no transaction dated after today (BAL-10).
- Setting the balance at a date that matches the derived balance writes nothing (BAL-4).
- Closing an account never changes its past balances or the past Net Worth (BAL-9).
- A closed account accepts no new transactions until it is reopened (BAL-9, BAL-14).
- Only the user's own accounts and transactions are read or written (D-48).

## Edge cases

- **A back-dated transaction** changes the balance from its date onwards and leaves earlier dates untouched (BAL-1).
- **A transaction before the starting balance** is rejected; in an import the row is flagged in the preview (BAL-6).
- **A starting balance of zero** still opens the account on its date.
- **Concurrent edits** of different transactions of the same account give the sum of both; there is no stored balance to race on (BAL-7).
- **A reconciliation in the past** (a statement balance at the end of last month) compares the balance at that date, not today's, and dates the adjustment there (BAL-3).
- **A movement recorded by hand and not yet booked by the bank** at the reconciliation date makes the difference wrong; the preview shows it before anything is written, and the user moves that transaction to the date the bank books it (D-68).
- **A transfer to a closed account** is rejected like any new transaction on it (BAL-9).
- **Several transactions on the same date** count in full on that date, whatever their `time`.

## Divergences from Actual Budget

1. **Starting balances and adjustments are not income.** In Actual Budget the starting balance of an on-budget account goes to the income category "Starting Balances", and a reconciliation adjustment is an ordinary transaction that can be categorised and counts in the budget. Here both have their own kind and never count as income or spending (D-25, [ADR-0008](../adr/0008-transaction-kind.md)).
2. **Revaluation through adjustments of their own kind.** Actual Budget creates a reconciliation transaction to bring an off-budget asset to its new value; here it is an `ADJUSTMENT`, so analytics can tell it apart from real movements (D-07, D-25).
3. **No cleared state and no locking.** Actual Budget reconciles against the transactions marked as cleared and then locks them; here reconciliation compares the derived balance at a date, and nothing is locked (D-68).
4. **The adjustment is dated on the date the user gives.** Actual Budget always dates the reconciliation adjustment today; here it takes the date of the balance being set, so a late reconciliation still corrects the right month (D-67).
5. **The current balance stops at today.** Actual Budget includes future-dated transactions in the account balance; here they are shown apart, so the balance matches the bank's (D-66).
6. **No transaction before the starting balance.** Actual Budget accepts them; here they are rejected, because the starting balance already contains them (D-65).

## Examples

### BAL-1 · A back-dated import changes the past balance

- **Given** account "Fineco", on-budget, opened with a starting balance of 1,000.00 dated 2026-03-01
- **When** on 2026-10-10 the March transactions are imported: −800.00 (rent) dated 2026-03-05 and +2,000.00 (salary) dated 2026-03-27
- **Then** the balance at 2026-03-04 is 1,000.00
- **And** the balance at 2026-03-05 is 200.00
- **And** the balance at 2026-03-31 is 2,200.00 (1,000 − 800 + 2,000)

### BAL-2 · Revaluation of an investment

- **Given** account "ETF portfolio", off-budget, type `INVESTMENT`, with a balance of 10,000.00 at 2026-10-30
- **When** the user sets its value at 2026-10-31 to 10,350.00
- **Then** an `ADJUSTMENT` of +350.00 dated 2026-10-31 is recorded on the account
- **And** the balance at 2026-10-31 is 10,350.00
- **And** the +350.00 counts towards Net Worth, not towards income

### BAL-3 · Reconciliation with a difference

- **Given** account "Checking" with a derived balance of 1,234.50 at 2026-10-31
- **When** on 2026-11-10 the user reconciles it with the bank's balance of 1,230.00 at 2026-10-31
- **Then** the preview shows a difference of −4.50
- **When** the user confirms
- **Then** an `ADJUSTMENT` of −4.50 dated 2026-10-31 is recorded, with no category
- **And** the balance at 2026-10-31 is 1,230.00

### BAL-4 · Reconciliation without a difference

- **Given** account "Checking" with a derived balance of 1,230.00 at 2026-10-31
- **When** the user reconciles it with the bank's balance of 1,230.00 at 2026-10-31
- **Then** no transaction is written

### BAL-5 · A starting balance is neither income nor spending

- **Given** no card account exists
- **When** the user opens account "Card", on-budget, with a starting balance of 200.00 dated 2026-10-01
- **Then** the account has one transaction of kind `STARTING_BALANCE`, +200.00, dated 2026-10-01, with no category
- **And** the balance at 2026-10-01 is 200.00
- **And** October's income does not include the 200.00

### BAL-6 · A transaction before the opening date

- **Given** account "Fineco" opened with a starting balance of 1,000.00 dated 2026-03-01
- **When** a transaction of −50.00 dated 2026-02-20 is created on the account
- **Then** it is rejected, because the starting balance already includes every movement before 2026-03-01

### BAL-7 · Edits and deletions need no recalculation

- **Given** account "Fineco" as at the end of BAL-1, with a balance of 2,200.00 at 2026-03-31
- **When** the −800.00 rent is deleted and, at the same moment, the salary is changed to +2,100.00
- **Then** the balance at 2026-03-31 is 3,100.00 (1,000 + 2,100)
- **And** the balance at 2026-03-04 is still 1,000.00

### BAL-8 · A debt account

- **Given** account "Mortgage", off-budget, type `LOAN`, opened with a starting balance of −150,000.00 dated 2026-01-01
- **And** account "Checking", on-budget, with a balance of 3,000.00 at 2026-01-31
- **When** a transfer of 1,000.00 from "Checking" to "Mortgage" is recorded on 2026-02-01
- **Then** the balance of "Mortgage" at 2026-02-01 is −149,000.00
- **And** the balance of "Checking" at 2026-02-01 is 2,000.00
- **And** the Net Worth of the two accounts is −147,000.00 both before and after the transfer

### BAL-9 · Closing an account with a balance

- **Given** today is 2026-11-01 in the user's time zone
- **And** account "Old savings", on-budget, with a balance of 300.00
- **And** account "Checking", on-budget
- **When** the user closes "Old savings" and moves its balance to "Checking"
- **Then** a transfer of 300.00 from "Old savings" to "Checking" dated 2026-11-01, with the notes "Closing account", is recorded, with no category
- **And** the balance of "Old savings" is 0.00 and the account is closed
- **And** its earlier balances, and the Net Worth history before 2026-11-01, are unchanged
- **When** a transaction dated 2026-11-05 is added to "Old savings"
- **Then** it is rejected, because the account is closed

### BAL-10 · A future-dated transaction

- **Given** today is 2026-11-09 in the user's time zone
- **And** account "Checking" with a balance of 1,000.00 at 2026-11-09
- **When** a transaction of −100.00 dated 2026-11-15 is added
- **Then** the current balance is 1,000.00
- **And** the balance at 2026-11-15 is 900.00

### BAL-11 · An adjustment converted into a regular transaction

- **Given** the `ADJUSTMENT` of −4.50 recorded in BAL-3
- **When** the user tries to give it the category "Bank › Fees"
- **Then** it is rejected, because an adjustment has no category
- **When** the user converts it into a `REGULAR` transaction with category "Bank › Fees"
- **Then** it is a `REGULAR` of −4.50 dated 2026-10-31 with that category
- **And** October's spending includes 4.50 in "Bank › Fees"
- **And** the balance at 2026-10-31 is still 1,230.00

### BAL-12 · Deleting an account

- **Given** account "Spare", opened with a starting balance of 0.00 and no other transactions
- **When** the user deletes it
- **Then** it is deleted with its starting balance
- **Given** account "Old card", with a transfer of 100.00 from "Checking" dated 2026-06-01
- **When** the user chooses the forced deletion of "Old card", shown with its warning
- **Then** "Old card" and all its transactions are deleted
- **And** the −100.00 on "Checking" becomes a `REGULAR` transaction with no `transferId`, and the balance of "Checking" does not change

### BAL-13 · On-budget is fixed at creation

- **Given** account "Deposit", on-budget
- **When** the user tries to make it off-budget
- **Then** it is rejected; to track it off-budget, the user closes it and opens a new off-budget account

### BAL-14 · Reopening a closed account

- **Given** account "Old savings", closed as in BAL-9
- **When** the user reopens it
- **Then** it is no longer closed and its history is unchanged
- **When** a transfer of 200.00 from "Checking" to "Old savings" dated 2026-12-01 is added
- **Then** it is accepted, and the balance of "Old savings" at 2026-12-01 is 200.00

### BAL-15 · Closing an account into an off-budget account

- **Given** today is 2026-11-01 in the user's time zone
- **And** account "Old checking", on-budget, with a balance of 300.00, and account "Brokerage", off-budget
- **When** the user closes "Old checking", moves its balance to "Brokerage" and gives the transfer the category "Savings › Investments"
- **Then** the −300.00 on "Old checking" has that category and the +300.00 on "Brokerage" has none
- **And** November's spending includes 300.00 in "Savings › Investments"
