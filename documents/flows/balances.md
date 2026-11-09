# Balances

How an account opens, how its balance and its history are computed, how it is reconciled with the bank, how the value of an investment changes, and how an account is closed. The balance is never stored: it is always the sum of the account's transactions. Models and fields are defined in the [data model](../domain/data-model.md).

**Decisions:** D-07 (investments as off-budget accounts with value adjustments; EUR only), D-11 (balances derived from transactions, starting balance as a transaction, [ADR-0003](../adr/0003-derived-balances.md)), D-12 (starting balance and reconcile in the MVP), D-25 (transaction kinds, [ADR-0008](../adr/0008-transaction-kind.md)), D-30 (calendar dates; the user's time zone decides "today"), D-48 (every query scoped to the user).

## Behaviour

### Opening an account

The user creates an account with a name, a type, on-budget or off-budget (`Account.isOnBudget`), a starting balance and the date it applies to. The account and its `STARTING_BALANCE` transaction are written together, in one database transaction. The starting balance has no category and no payee: it is neither income nor spending (D-25).

[NEEDS CLARIFICATION: Rules of the starting balance. Proposal: exactly one per account, always created (also with 0, because its date marks the opening of the account), its amount and date editable, never deleted on its own; a transaction dated before it is rejected (in an import, the row is flagged in the preview), because the starting balance already contains everything before its date. Alternatives: earlier transactions accepted with a warning, or accepted silently as in Actual Budget.]

### Balance at a date

The balance of an account at a date `d` is the sum of `Transaction.amount` over the account's transactions with `Transaction.date` ≤ `d`, of every kind. The history is the same sum taken at each date (a cumulative sum by date, computed by the database); any granularity, daily or month-end, is a reading of the same sum.

The current balance is the balance at today's date in the user's time zone (D-30). [NEEDS CLARIFICATION: Do transactions dated in the future count in the current balance? Proposal: no, the current balance stops at today and future-dated transactions are shown apart; Actual Budget includes them in the account balance.]

Because nothing is stored, a back-dated import, an edit or a deletion changes the balance from its date onwards, and only from there. There are no deltas to apply, so two concurrent edits cannot apply one twice.

### Reconciling with the bank

The user enters the balance shown by the bank at a date. The system compares it with the derived balance at that date; if they differ, it records the difference as an `ADJUSTMENT` transaction on the account. If they match, nothing is written.

### Changing the value of an investment

An off-budget account that holds an investment, a property or a vehicle has no transaction for every price change. The user enters its current value at a date; the system records the difference from the derived balance as an `ADJUSTMENT` (D-07, D-11). Adjustments move the balance and the Net Worth, never income or spending (D-25).

[NEEDS CLARIFICATION: Is reconciliation the same operation as a revaluation ("set the balance at a date", for any account), and which date does the adjustment get? Proposal: one operation; the adjustment is dated on the date the user gives, which defaults to today. Actual Budget always dates the reconciliation adjustment today.]

[NEEDS CLARIFICATION: Do transactions carry a cleared or reconciled state? Actual Budget reconciles against the cleared transactions and then locks them. Proposal: not in the MVP; reconciliation compares the derived balance at a date, and nothing is locked.]

### Debt accounts

A mortgage or a loan is an off-budget account with a negative balance: its starting balance is the debt, with a minus sign, and each repayment is a transfer into it. Its balance moves towards zero and lowers the Net Worth while negative.

### Closing and deleting an account

[NEEDS CLARIFICATION: Closing and deleting, see the data model. Proposal, as in Actual Budget: an account without transactions is deleted; an account with transactions is closed: its remaining balance, if any, is moved to another account with a transfer, `Account.closedAt` is set, no new transactions are accepted, and its history stays in the Net Worth. A forced deletion removes the account and its transactions, and turns their transfer counterparts into regular transactions.]

### On-budget and off-budget

`Account.isOnBudget` decides whether the account's transactions count as income and spending and whether a transfer to or from it crosses the budget boundary (D-25); the rules are in the [transfers flow](transfers.md). Net Worth counts every account, on-budget and off-budget.

## Invariants

- The balance at a date is the sum of the transactions dated up to that date, whatever day they were written (BAL-1, BAL-7).
- Starting balances and adjustments move the balance and the Net Worth, never income or spending (BAL-2, BAL-5).
- A reconciliation that finds no difference writes nothing (BAL-4).
- Only the user's own accounts and transactions are read or written (D-48).

## Edge cases

- **A back-dated transaction** changes the balance from its date onwards and leaves earlier dates untouched (BAL-1).
- **A transaction before the starting balance:** see the clarification in [Opening an account](#opening-an-account) (BAL-6).
- **A starting balance of zero** still opens the account on its date.
- **Concurrent edits** of different transactions of the same account give the sum of both; there is no stored balance to race on (BAL-7).
- **A reconciliation in the past** (a statement balance at the end of last month) compares the balance at that date, not today's (BAL-3).
- **Several transactions on the same date** count in full on that date, whatever their `time`.

## Divergences from Actual Budget

1. **Starting balances and adjustments are not income.** In Actual Budget the starting balance of an on-budget account goes to the income category "Starting Balances", and a reconciliation adjustment is an ordinary transaction that can be categorised and counts in the budget. Here both have their own kind and never count as income or spending (D-25, [ADR-0008](../adr/0008-transaction-kind.md)).
2. **Revaluation through adjustments of their own kind.** Actual Budget creates a reconciliation transaction to bring an off-budget asset to its new value; here it is an `ADJUSTMENT`, so analytics can tell it apart from real movements (D-07, D-25).
3. **No cleared state and no locking**, if the clarification above confirms the proposal.

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
- **When** the user reconciles it with the bank's balance of 1,230.00 at 2026-10-31
- **Then** an `ADJUSTMENT` of −4.50 dated 2026-10-31 is recorded
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

- **Given** account "Mortgage", off-budget, type `DEBT`, opened with a starting balance of −150,000.00 dated 2026-01-01
- **And** account "Checking", on-budget, with a balance of 3,000.00 at 2026-01-31
- **When** a transfer of 1,000.00 from "Checking" to "Mortgage" is recorded on 2026-02-01
- **Then** the balance of "Mortgage" at 2026-02-01 is −149,000.00
- **And** the balance of "Checking" at 2026-02-01 is 2,000.00
- **And** the Net Worth of the two accounts is −147,000.00 both before and after the transfer

### BAL-9 · Closing an account with a balance

- **Given** account "Old savings", on-budget, with a balance of 300.00 at 2026-11-01
- **And** account "Checking", on-budget
- **When** the user closes "Old savings" on 2026-11-01 and moves its balance to "Checking"
- **Then** a transfer of 300.00 from "Old savings" to "Checking" dated 2026-11-01 is recorded
- **And** the balance of "Old savings" is 0.00 and the account is closed
- **And** its earlier balances, and the Net Worth history before 2026-11-01, are unchanged

### BAL-10 · A future-dated transaction

- **Given** today is 2026-11-09 in the user's time zone
- **And** account "Checking" with a balance of 1,000.00 at 2026-11-09
- **When** a transaction of −100.00 dated 2026-11-15 is added
- **Then** the current balance is 1,000.00
- **And** the balance at 2026-11-15 is 900.00
