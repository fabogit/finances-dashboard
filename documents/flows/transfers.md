# Transfers

Money moved between two of the user's own accounts: a linked pair of transactions with opposite amounts. When one side is created, the other is generated; when the other account is imported later, the generated side is recognised instead of duplicated. Models and fields are defined in the [data model](../domain/data-model.md).

**Decisions:** D-24 (linked pair, generated counterpart, manual transfers through `POST /transfers`), D-25 (kind `TRANSFER`; only transfers that cross the on/off-budget boundary count as income or spending, [ADR-0008](../adr/0008-transaction-kind.md)), D-28 (transfers between on-budget accounts are uncategorised), D-16 (approximate matching recognises the generated side, [ADR-0007](../adr/0007-layered-deduplication.md)), D-11 (balances derived, so both balances are right at once).

## Behaviour

### The pair

A transfer is two transactions with `Transaction.kind` = `TRANSFER`, one on each account, with opposite `Transaction.amount`, each pointing to the other through `Transaction.transferId`. Both are written in one database transaction. The two accounts belong to the same user and are different.

### Creating a transfer

- **By hand:** `POST /transfers` with the source account, the destination account, the amount and the date (D-24). Both sides are created with that date: the source with the negative amount, the destination with the positive one.
- **From an existing transaction:** the user, a rule or the import preview marks a transaction as a transfer to another account (D-23, D-24). It becomes the first side and keeps its date and amount; the counterpart is generated on the other account with the same date and the opposite amount.
- **In the import preview** a transfer is only ever a suggestion, confirmed by the user (D-24): from a rule, or from the heuristic "opposite amount on another of the user's accounts, date within a few days". The details are in the import flow.

### When the other side is imported later

The generated counterpart already moves the destination account's balance. When the user later imports the destination account's statement, the row for the same movement is matched against the generated side by the approximate duplicate check (same account, same amount, date within the window), and the preview proposes to merge them; after the merge one transaction remains, still linked to the first side (D-16, D-24). Which fields the bank row brings into the merged transaction is defined in the import flow.

### Category

| Source account | Destination account | Category | Counts as |
| --- | --- | --- | --- |
| on-budget | on-budget | none on either side (D-28) | nothing: only the balances move |
| off-budget | off-budget | none on either side | nothing: only the balances move |
| on-budget | off-budget | on the on-budget side | spending (D-25) |
| off-budget | on-budget | on the on-budget side | income (D-25) |

[NEEDS CLARIFICATION: In a transfer that crosses the boundary, does only the on-budget side carry the category, as in Actual Budget (used in the table above)? The off-budget side would always stay uncategorised.]

### Payee

[NEEDS CLARIFICATION: What is the payee of a transfer? In Actual Budget the payee *is* the other account (one transfer payee per account), which is how a transfer is created and how rules target it. Proposal: no payee (`Transaction.payeeId` is `null`), the other account being reached through `Transaction.transferId`; rules mark a transfer with their own "transfer to account" action (D-23).]

### Editing a transfer

[NEEDS CLARIFICATION: What changes on the other side when one side is edited, and can two existing transactions be linked into a transfer? Proposal, as in Actual Budget: amount and notes stay in sync (changing one side's amount changes the other's to the opposite); the date and the category are independent, because banks book the two sides on different days; two existing transactions on different accounts with exactly opposite amounts can be linked into a transfer, and that is also what a merge at import does.]

### Deleting a transfer

Deleting either side deletes both, in one database transaction (D-24, as in Actual Budget).

## Invariants

- The two sides are on different accounts of the same user, have opposite amounts and kind `TRANSFER`, and point to each other (TRF-1, TRF-3, TRF-8).
- Neither side exists without the other (TRF-5).
- A transfer that does not cross the on/off-budget boundary has no category on either side and never counts as income or spending (TRF-1, TRF-7).
- A transfer that crosses the boundary counts once: as spending when money leaves the budget, as income when it enters (TRF-2, TRF-6).

## Edge cases

- **The two sides booked on different days** (−500 on 5 October, +500 on 6 October): the pair stays linked; each balance moves on its own date (TRF-4).
- **The other side never imported** (cash, an off-budget account updated by hand): the generated side stays as it is and keeps the destination balance right (TRF-3).
- **The generated side not recognised at import** (the bank date falls outside the window): the row appears in the preview as a new transaction, not as a duplicate; the user can still merge it by hand or discard it. Nothing is merged or dropped silently (D-16).
- **Source and destination are the same account:** rejected (TRF-8).
- **A side on a closed account:** follows the rules for closed accounts in the [balances flow](balances.md#closing-and-deleting-an-account).

## Divergences from Actual Budget

1. **Transaction kind.** Actual Budget recognises a transfer by its transfer payee; here a transfer has its own kind, `TRANSFER`, which the analytics rule reads directly (D-25, [ADR-0008](../adr/0008-transaction-kind.md)).
2. **Payee**, if the clarification above confirms the proposal: no transfer payees; the link is the other transaction, and rules use a "transfer to account" action (D-23).

## Examples

### TRF-1 · A transfer between two on-budget accounts

- **Given** accounts "Checking" and "Deposit", both on-budget
- **When** a transfer of 500.00 from "Checking" to "Deposit" dated 2026-10-10 is created with `POST /transfers`
- **Then** "Checking" has a `TRANSFER` of −500.00 and "Deposit" a `TRANSFER` of +500.00, both dated 2026-10-10
- **And** each points to the other
- **And** neither has a category
- **And** October's spending and income do not include them

### TRF-2 · A transfer to an off-budget account is spending

- **Given** account "Checking", on-budget, and account "Brokerage", off-budget
- **When** a transfer of 300.00 from "Checking" to "Brokerage" dated 2026-10-15 is created, with category "Savings › Investments"
- **Then** the −300.00 on "Checking" has category "Savings › Investments"
- **And** the +300.00 on "Brokerage" has no category
- **And** October's spending includes 300.00 in "Savings › Investments"

### TRF-3 · Marking an imported row as a transfer generates the counterpart

- **Given** accounts "Checking" and "Deposit", both on-budget
- **When** on 2026-10-05 the "Checking" statement is imported and the row "BONIFICO A FAVORE DI CONTO DEPOSITO" of −500.00 dated 2026-10-05 is marked as a transfer to "Deposit" in the preview, and the import is confirmed
- **Then** the row is saved on "Checking" as a `TRANSFER` of −500.00
- **And** a `TRANSFER` of +500.00 dated 2026-10-05 is generated on "Deposit", linked to it
- **And** the balance of "Deposit" includes the +500.00 from 2026-10-05

### TRF-4 · Importing the other side later merges it with the generated one

- **Given** the transfer of TRF-3
- **When** on 2026-10-20 the "Deposit" statement is imported and contains +500.00 dated 2026-10-06
- **Then** the preview shows that row as a possible duplicate of the generated +500.00
- **When** the user confirms the merge
- **Then** "Deposit" has one `TRANSFER` of +500.00 for this movement, still linked to the −500.00 on "Checking"

### TRF-5 · Deleting one side deletes both

- **Given** the transfer of TRF-1
- **When** the +500.00 on "Deposit" is deleted
- **Then** the −500.00 on "Checking" is deleted too
- **And** the balances of both accounts are as before the transfer

### TRF-6 · A transfer from an off-budget account is income

- **Given** account "Brokerage", off-budget, and account "Checking", on-budget
- **When** a transfer of 1,000.00 from "Brokerage" to "Checking" dated 2026-10-20 is created, with category "Income › Investment income"
- **Then** the +1,000.00 on "Checking" has that category and the −1,000.00 on "Brokerage" has none
- **And** October's income includes 1,000.00

### TRF-7 · A transfer between two off-budget accounts

- **Given** accounts "Brokerage" and "Pension fund", both off-budget
- **When** a transfer of 2,000.00 from "Brokerage" to "Pension fund" is created
- **Then** neither side has a category
- **And** neither spending nor income includes it
- **And** the Net Worth does not change

### TRF-8 · A transfer to the same account is rejected

- **Given** account "Checking"
- **When** a transfer from "Checking" to "Checking" is requested
- **Then** it is rejected and nothing is written

### TRF-9 · Editing the amount of one side

- **Given** the transfer of TRF-1
- **When** the −500.00 on "Checking" is changed to −450.00
- **Then** the side on "Deposit" becomes +450.00
- **And** changing the date of one side leaves the other side's date unchanged

### TRF-10 · Linking two existing transactions

- **Given** a `REGULAR` −200.00 on "Checking" dated 2026-10-03 and a `REGULAR` +200.00 on "Deposit" dated 2026-10-04, both on-budget
- **When** the user links them as a transfer
- **Then** both become `TRANSFER`, point to each other, lose their category and keep their dates
- **When** the user tries to link −200.00 on "Checking" with +150.00 on "Deposit"
- **Then** it is rejected, because the amounts are not opposite
