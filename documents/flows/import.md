# Import

How a bank file becomes transactions: the user uploads an xlsx or csv file for one account, a template maps its columns, every row is validated, given a payee and a category, checked for duplicates and for transfers, and shown in a preview. Nothing is saved until the user confirms, and the server checks everything again on confirm. Models and fields are defined in the [data model](../domain/data-model.md); payees and rules in the [rules and payees flow](rules-payees.md).

**Decisions:** D-05 (dynamic mapper for xlsx and csv), D-06 (stateless preview, re-validated on confirm, [ADR-0004](../adr/0004-stateless-import-staging.md)), D-13 (category sources in order: rules, payee default, bank category mapping), D-14 (parsing, mapping, rules, deduplication and preview in the core, [ADR-0005](../adr/0005-python-science-service-rest.md)), D-15 and D-43 (named templates, a default template per account, account chosen at upload), D-16 (layered deduplication, nothing dropped silently, [ADR-0007](../adr/0007-layered-deduplication.md)), D-22 (payee from a column or from cleanup and rules; proposals, never silent), D-23 (rules applied in every preview), D-24 (transfer suggestions confirmed by the user), D-30 (calendar date and optional time), D-48 (every query scoped to the user), D-59 (amounts in cents), D-65 (no transaction before the starting balance), D-79 (names ignore case), D-83 (template proposal by exact header), D-84 (notes column), D-85 (rows not booked yet), D-86 (composition of the exact hash), D-87 (choices on duplicates), D-88 (window of the approximate match), D-89 (fields of a merge), D-90 (confirm with differences), D-95 (category mappings as rows with a foreign key).

## Behaviour

### Uploading a file

The user uploads one file for one account, chosen at upload: the account is never deduced from the file or from a category (D-15). The file is xlsx or csv (D-05). The template that reads it is, in order (D-15, D-43):

1. the template the user chose for this upload;
2. otherwise, the account's default template (`Account.defaultImportTemplateId`);
3. otherwise, a template proposed by the system;
4. otherwise, the user maps the columns by hand in the preview, and can save the mapping as a new template.

The system's proposal (step 3) compares the file's header row with the header saved on each of the user's templates (`ImportTemplate.headerSignature`) and proposes the template whose header matches exactly. The preview says the template was proposed; the user can keep it or pick another. There is no approximate comparison of headers in the MVP (D-83, IMP-16).

### Import templates

A template is a named mapping of one bank's file, reusable across accounts (D-15, D-43). It records:

- where the rows start (`ImportTemplate.startRow`), and the csv delimiter;
- which column holds each field (`ImportTemplate.columns`): the date (required), the time, the amount (required, as one signed column or as two columns for money in and money out), the description (required), the payee, the notes, the bank's category, the bank's transaction ID, the booking status;
- how dates and amounts are written (`ImportTemplate.dateFormat`, `ImportTemplate.decimalSeparator`), and the sign convention (`ImportTemplate.signConvention`): a signed amount, a signed amount to flip, or separate in and out columns;
- the mapping from the bank's category values to the user's categories (`ImportTemplateCategoryMapping`), such as "Spesa supermercato" → "Food › Groceries". Each mapping is a row with a foreign key to the category, so deleting a category moves or removes it ([categories flow](categories.md#deleting-a-category), D-95);
- the window of the approximate match (`ImportTemplate.matchWindowDays`, [Duplicates](#duplicates)).

Template names follow the rule for names the user sees: unique per user, ignoring case and surrounding spaces (D-79). Deleting a template sets the default template of the accounts that used it to `null`.

The notes column is optional, as in Actual Budget: it fills `Transaction.notes`, and a rule can still set the notes of a row whose column is empty (D-23, D-78, D-84, IMP-17).

### Reading and validating the rows

Each row is read with the template and turned into a candidate transaction: calendar date, optional local time (D-30), amount in cents (D-59), description, and the optional bank ID, bank category and payee text. A row that cannot be read is an **error row**: it shows the reason ("date 31/02/2026 is not a valid date", "amount 12,3,4 is not a number") and the original values. It is never read as 0, as an empty date or as today, and it cannot be confirmed until the user fixes it or discards it. Empty rows at the end of the file are skipped and counted.

A row dated before the account's starting balance is flagged and cannot be confirmed as it is ([balances flow](balances.md#opening-an-account), D-65): the user discards it, or first moves the starting balance back.

Some banks list payments they have not booked yet, such as the rows of Fineco's "Contabilizzazione" column. Their date and description can change when the bank books them, so importing them now would give a duplicate later, and a reconciliation against the bank's balance would see a difference that is not there (D-67). A template can map the booking status column and the value that means "not booked" (`ImportTemplate.notBookedValue`). Such rows are shown in the preview, deselected, with the label "not booked yet"; the user can still select them (D-85, IMP-18).

### Payee and category of each row

For every valid row, in this order:

1. **Imported payee.** The template's payee column if it has one; otherwise the description after deterministic cleanup. The result is stored in `Transaction.importedPayee` ([rules and payees flow](rules-payees.md#imported-payee)).
2. **Rules.** The user's rules run on the row, in order; for each field the first rule that sets it wins (D-23). They can set the payee, the category, the notes, or mark the row as a transfer.
3. **Payee.** If no rule set it, the payee whose name equals the imported payee, ignoring case (D-79). If none exists, the preview proposes a new payee with that name; it is created only if the user accepts (D-22).
4. **Category**, from the first source that gives one (D-13):
   1. a rule;
   2. the payee's default category (`Payee.defaultCategoryId`);
   3. the template's mapping of the bank's category value;
   4. none: the row is uncategorised.

   The category suggested by the computation service is post-MVP. The preview shows the source of each row's category: the rule, the payee default, the bank mapping, or none (D-13).

When the user changes the category of a row that has a payee, the preview proposes saving that category as the payee's default, or creating a rule; nothing is saved without the user's answer (D-22).

### Duplicates

Every valid row is checked against the account's existing transactions, in layers, from certainty to suggestion (D-16, [ADR-0007](../adr/0007-layered-deduplication.md)):

1. **Bank ID.** A row whose bank ID already exists on the account (`Transaction.bankId`) is already imported.
2. **Exact hash.** A row whose hash already exists on the account (`Transaction.importHash`) is already imported: the same file, or an overlapping one, imported again.
3. **Approximate match.** A row with the same amount as an existing transaction of the same account, dated within the window, is a *possible duplicate*: a transaction entered by hand, or the generated side of a transfer ([transfers flow](transfers.md#when-the-other-side-is-imported-later)).

Uniqueness is per account, never global: the same row on another account or for another user is not a duplicate (D-16). Every duplicate is shown in the preview with its layer and the transaction it matches; nothing is discarded silently (D-16).

#### The exact hash

The hash (`Transaction.importHash`) is a SHA-256 of (D-86):

- the date;
- the time, when the template maps one;
- the amount in cents;
- the description, as read;
- the row's **occurrence number** among the identical rows of the same file: the first of two rows "BAR CENTRALE", −1.20, on the same day is 1, the second is 2.

It is computed on the row as read, before the user or a rule changes anything, so the same row always gives the same hash. The occurrence number keeps two legitimate identical rows apart, and it survives an overlapping file: in a file with October and November, the two coffees of October are still the first and the second of their kind, so both are recognised (IMP-9). The row's position in the file would not: it changes from one file to the next.

#### What the user can do

- **Already imported** (bank ID or exact hash): the row is shown deselected, linked to the transaction it matches, so the user can check it. It cannot be imported again; the unique constraints would reject it (D-87, IMP-19).
- **Possible duplicate:** three choices, merge it with the transaction it matches (the default), import it as a new transaction, or discard it (D-87, IMP-20).

#### The window of the approximate match

The window is set on the template (`ImportTemplate.matchWindowDays`): from 1 to 90 days before and after the row's date, 7 by default, as in Actual Budget (D-88). A bank that books card payments late can have a wider one; most banks need 3 to 10 days. When several transactions match a row, as in Actual Budget, the one with the same payee comes first, then the nearest date, and each existing transaction matches at most one row.

Only transactions with no bank ID and no hash are candidates: those entered by hand and the generated sides of transfers, which are what the approximate match is for. A transaction that came from an import already has its own row in some file, so with a wide window a monthly payment of the same amount is not taken for a duplicate of last month's (D-88, IMP-21, IMP-22).

### Merging a row with an existing transaction

When the user merges a row with the transaction it matches, one transaction remains: the existing one, completed with the bank's data. A merged generated transfer side stays linked to its pair (D-24).

The fields of the merged transaction (D-89, IMP-23):

| Field | Value |
| --- | --- |
| payee, category, notes | the existing transaction's, when set; otherwise the row's, as in Actual Budget |
| `bankId`, `importHash`, `description`, `importedPayee` | the row's, so a later re-import recognises it |
| `date`, `time` | the row's |
| `amount` | the same on both, by definition of the match |

The date comes from the bank, unlike Actual Budget, which keeps the existing date: every imported transaction of the account then has the bank's date, and the account follows the bank's list when it is reconciled (D-67, D-68). A purchase entered on 31 October and booked by the bank on 2 November moves to November; the user can still change its date. For a side of a transfer, only that side changes; the other side keeps its own date (D-73).

### Transfer suggestions

The preview suggests that a row is one side of a transfer when (D-24):

- a rule marks it as a transfer to an account (D-23); or
- another of the user's accounts has a transaction with the opposite amount within the template's window (D-88), which is not already a transfer. Here imported transactions are candidates too: the other side of a transfer usually comes from another bank file.

A suggestion is never applied without the user's confirmation. When confirmed, the row is saved as a `TRANSFER`: either the counterpart is generated on the other account, or, when the counterpart already exists there, the two are linked ([transfers flow](transfers.md#creating-a-transfer)). A transfer to a closed account is not suggested.

### The preview

The upload returns, without writing anything (D-06):

- the template used and how it was chosen;
- every row, with its original values, the candidate transaction, the payee and the category with their sources, and its status: new, error, already imported, possible duplicate, suggested transfer, before the starting balance;
- the proposals: new payees, payee defaults, rules;
- totals: rows read, rows skipped, and the count of each status.

The user edits the rows, chooses for each duplicate and suggestion, accepts or declines proposals, and confirms. Closing the page loses the review (ADR-0004).

### Confirming

The client sends the rows the user wants to import, with every choice. The server trusts nothing it receives: it reads the account, the rules, the payees and the existing transactions again and recomputes every check (D-06). If everything still holds, it writes in one database transaction: the new transactions, the merges, the transfer counterparts and links, and the accepted payees, payee defaults and rules.

When the re-validation differs from what the user saw (another import added a duplicate meanwhile, a category in the rows was deleted, the account was closed), nothing is saved: the confirm answers 409 Conflict with a new preview of the same rows, and the user reviews the differences. Saving only the rows that still hold would import part of a file silently (D-90, IMP-24).

### Without the computation service

The import does not call the computation service in the MVP: parsing, mapping, rules, deduplication and the preview run in the core (D-14, [ADR-0005](../adr/0005-python-science-service-rest.md)). An import works the same whether the service is up or down. When the category suggestion of the service arrives (post-MVP), it will be the last category source, and an import with the service down will only lack that suggestion.

## Invariants

- Nothing is written before the user confirms, and a confirm writes everything or nothing (IMP-1, IMP-13).
- Every row of the file is accounted for in the preview: imported, skipped as empty, error, duplicate or discarded; nothing disappears silently (IMP-3, IMP-12).
- A row that cannot be read is never saved with a default value (IMP-3).
- A bank ID or an exact hash appears at most once per account (IMP-7, IMP-8).
- Every category in the preview shows its source (IMP-2).
- No payee, payee default or rule is created without the user's acceptance (IMP-2, RUL-4).
- The import works with the computation service down (IMP-11).
- An already imported row cannot be imported again (IMP-19).
- A transaction that came from an import is never a candidate for the approximate match (IMP-22).

## Edge cases

- **A file for the wrong account:** the template matches but every row is new; nothing tells the account apart, so the user must check the preview. A starting balance after the rows' dates flags them all (IMP-14).
- **The same file imported twice:** every row is already imported (IMP-8).
- **Two identical rows in one file:** both are new (IMP-9).
- **An overlapping file** (October, then October and November): October's rows are already imported, November's are new (IMP-8).
- **A row that matches a generated transfer side:** a possible duplicate, merged by default ([TRF-4](transfers.md#trf-4--importing-the-other-side-later-merges-it-with-the-generated-one)).
- **A possible duplicate the user imports as new:** both transactions stay; the user takes responsibility for it.
- **An empty file, or one with only a header:** an empty preview, nothing to confirm.
- **A row not booked yet, imported anyway:** when the bank books it, its date or description may differ, so the booked row is usually a new row; with no bank ID, the approximate match does not see the first one either, since it came from an import. The label in the preview warns of this (IMP-18).
- **A wide window** (30 or 90 days) on an account with manual entries flags more possible duplicates; the user chooses for each one (D-88).
- **Two possible duplicates for one existing transaction:** only the first row in the order of preference matches it; the other is new (D-88).

## Divergences from Actual Budget

1. **Templates are named and shared across accounts.** Actual Budget remembers the csv settings of each account; here a template has a name, can serve several accounts of the same bank, and an account has a default one (D-15, D-43).
2. **Layered deduplication.** Actual Budget matches by imported ID and then approximately; here the exact hash adds a certain layer for re-imports of files without IDs (D-16, [ADR-0007](../adr/0007-layered-deduplication.md)).
3. **Category sources in a fixed order, shown per row** (D-13).
4. **The server re-validates on confirm.** Actual Budget's preview and import run in the same local application; here the client is not trusted (D-06, [ADR-0004](../adr/0004-stateless-import-staging.md)).
5. **The window of the approximate match is set per template,** from 1 to 90 days; Actual Budget uses 7 days. Imported transactions are never candidates; Actual Budget leaves them out only when the row has a bank ID too (D-88).
6. **A merge takes the bank's date.** Actual Budget keeps the date of the existing transaction (D-89).
7. **Rows not booked yet are deselected** when the template maps the booking status (D-85).

## Examples

### IMP-1 · The preview writes nothing

- **Given** account "Checking" with 10 transactions
- **When** the user uploads a file of 20 rows for "Checking"
- **Then** the preview shows 20 rows
- **And** "Checking" still has 10 transactions

### IMP-2 · The source of the category

- **Given** a rule "imported payee contains ESSELUNGA → payee Esselunga"
- **And** payee "Esselunga" with default category "Food › Groceries"
- **And** the template maps the bank's category "Spesa supermercato" to "Food › Supermarket"
- **When** the row "PAGAMENTO POS ESSELUNGA MILANO 1234", −62.40, bank category "Spesa supermercato" is previewed
- **Then** its payee is "Esselunga", set by the rule
- **And** its category is "Food › Groceries", with the source "payee default", because the payee default comes before the bank mapping
- **When** the user changes its category to "Food › Supermarket"
- **Then** the preview proposes to save "Food › Supermarket" as the default category of "Esselunga"
- **And** nothing is saved unless the user accepts

### IMP-3 · A row that cannot be read is an error

- **Given** a file with a row dated "31/02/2026" and a row with the amount "12,3,4"
- **When** the file is previewed
- **Then** both rows are errors, with the reason and the original values
- **And** neither has a date of today, an empty date or an amount of 0
- **And** the import cannot be confirmed while they are selected

### IMP-4 · Template order

- **Given** templates "Fineco account" and "Fineco card", and account "Card" with default template "Fineco card"
- **When** the user uploads a file for "Card" choosing "Fineco account"
- **Then** the file is read with "Fineco account"
- **When** the user uploads a file for "Card" choosing no template
- **Then** the file is read with "Fineco card"

### IMP-5 · A template serves two accounts

- **Given** template "Fineco card" and accounts "Card" and "Second card", both with default template "Fineco card"
- **When** the user uploads the monthly export of each card
- **Then** both are read with "Fineco card" and each row goes to the account chosen at upload

### IMP-6 · A manual entry is a possible duplicate

- **Given** a transaction "Fuel" of −50.00 on "Checking" dated 2026-10-03, entered by hand
- **When** on 2026-10-10 the "Checking" statement is previewed with the row "PAGAMENTO POS ENI 1234", −50.00, dated 2026-10-04
- **Then** the row is a possible duplicate of "Fuel"
- **When** the user confirms the merge
- **Then** "Checking" has one transaction of −50.00 for this payment, with the bank's description

### IMP-7 · Bank IDs

- **Given** a template that maps the bank's transaction ID, and a transaction on "Checking" with bank ID `TX-1`
- **When** a file for "Checking" with a row whose bank ID is `TX-1` is previewed
- **Then** the row is already imported
- **When** a file for "Card" with a row whose bank ID is `TX-1` is previewed
- **Then** the row is new

### IMP-8 · Re-importing the same file

- **Given** the October statement of "Checking", 120 rows, imported on 2026-11-02
- **When** the same file is previewed again
- **Then** all 120 rows are already imported, by exact hash
- **When** a file with October and November is previewed
- **Then** October's rows are already imported and November's are new

### IMP-9 · Two identical rows in one file

- **Given** a file with two rows "BAR CENTRALE", −1.20, dated 2026-10-03, with no time column
- **When** the file is previewed and confirmed
- **Then** both are imported as two transactions
- **When** the same file is previewed again
- **Then** both rows are already imported

### IMP-10 · A full preview

- **Given** account "Checking" and the October statement of 120 rows
- **And** 3 of them were entered by hand, 15 match no rule, payee default or bank mapping, 2 are transfers to "Deposit" with their other sides already on "Deposit", and 1 is not booked yet
- **When** the statement is previewed
- **Then** 3 rows are possible duplicates of the manual entries
- **And** 15 rows are uncategorised, with the source "none"
- **And** 2 rows are suggested transfers to "Deposit"
- **And** 1 row is shown as not booked yet
- **And** nothing has been written

### IMP-11 · Import with the computation service down

- **Given** the computation service is not running
- **When** the user uploads and confirms a statement
- **Then** the preview and the confirm work as with the service up

### IMP-12 · Nothing is dropped silently

- **Given** a file of 120 rows, 3 of them empty at the end
- **When** the file is previewed
- **Then** the preview counts 117 rows read and 3 skipped as empty

### IMP-13 · Confirm is all or nothing

- **Given** a preview of 20 new rows
- **When** the user confirms and the database rejects the 15th row
- **Then** none of the 20 rows is saved

### IMP-14 · A row before the starting balance

- **Given** account "Fineco" opened with a starting balance dated 2026-03-01
- **When** a file with a row dated 2026-02-20 is previewed for "Fineco"
- **Then** the row is flagged as before the starting balance and cannot be confirmed as it is

### IMP-15 · A transfer suggestion merges with the existing side

- **Given** a `REGULAR` +500.00 on "Deposit" dated 2026-10-06
- **When** the "Checking" statement with "BONIFICO A FAVORE DI CONTO DEPOSITO", −500.00, dated 2026-10-05 is previewed
- **Then** the row is a suggested transfer to "Deposit", matching the +500.00
- **When** the user confirms the suggestion
- **Then** the −500.00 and the +500.00 are linked as a transfer, each keeping its date, and nothing is generated

### IMP-16 · The system proposes a template by its header

- **Given** template "Fineco account", whose saved header is the row "Data, Operazione, Dettagli, Conto o carta, Contabilizzazione, Categoria, Valuta, Importo"
- **And** account "New account" with no default template
- **When** the user uploads a file for "New account" with that header, choosing no template
- **Then** the preview proposes "Fineco account" and says it was proposed
- **When** the file's header has one more column
- **Then** no template is proposed, and the user maps the columns by hand

### IMP-17 · A notes column

- **Given** a template that maps a notes column
- **When** a row with notes "Dinner with Marco" is previewed and confirmed
- **Then** the transaction's notes are "Dinner with Marco"

### IMP-18 · A row not booked yet

- **Given** template "Fineco account", which maps the column "Contabilizzazione" with the value "Non contabilizzato" meaning not booked
- **When** a file with 30 booked rows and 1 row "Non contabilizzato" is previewed
- **Then** the 30 rows are selected and the other is deselected, labelled "not booked yet"
- **When** the user confirms without selecting it
- **Then** 30 transactions are saved

### IMP-19 · An already imported row is shown, not importable

- **Given** the row "PAGAMENTO POS ENI 1234", −50.00, of 2026-10-04 already imported on "Checking"
- **When** a file with the same row is previewed for "Checking"
- **Then** the row is deselected, already imported, and linked to the existing transaction
- **And** the user cannot select it for import

### IMP-20 · A possible duplicate imported as new

- **Given** the situation of IMP-6
- **When** the user chooses to import the row as a new transaction and confirms
- **Then** "Checking" has two transactions of −50.00: "Fuel" and the bank's row

### IMP-21 · The template's window

- **Given** a transaction of −30.00 on "Card", dated 2026-10-01, entered by hand
- **And** template "Fineco card" with a window of 3 days
- **When** a "Card" file with a row of −30.00 dated 2026-10-06 is previewed with "Fineco card"
- **Then** the row is new
- **When** the window of "Fineco card" is 7 days and the file is previewed again
- **Then** the row is a possible duplicate of the manual transaction

### IMP-22 · Imported transactions are not candidates

- **Given** template "Fineco account" with a window of 90 days
- **And** the row "ADDEBITO SDD NETFLIX.COM", −12.99, of 2026-09-15, already imported on "Checking"
- **When** the October statement with "ADDEBITO SDD NETFLIX.COM", −12.99, of 2026-10-15 is previewed
- **Then** the October row is new, not a possible duplicate of September's

### IMP-23 · The fields of a merge

- **Given** a transaction on "Checking" entered by hand: 2026-10-31, −52.30, payee "Esselunga", category "Food › Groceries", notes "Dinner with Marco"
- **When** the row "PAGAMENTO POS ESSELUNGA MILANO 1234", −52.30, of 2026-11-02 is previewed and the user confirms the merge
- **Then** one transaction remains, with payee "Esselunga", category "Food › Groceries" and notes "Dinner with Marco"
- **And** its date is 2026-11-02, its description and imported payee are the bank's, and it has the row's hash
- **When** the same file is previewed again
- **Then** the row is already imported

### IMP-24 · The confirm finds a difference

- **Given** a preview of 20 new rows for "Checking"
- **When** another import confirms one of those rows on "Checking" before the user confirms
- **And** the user confirms
- **Then** nothing is saved
- **And** the answer is 409 Conflict with a new preview, where that row is already imported
