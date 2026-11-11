# Import

How a bank file becomes transactions: the user uploads an xlsx or csv file for one account, a template maps its columns, every row is validated, given a payee and a category, checked for duplicates and for transfers, and shown in a preview. Nothing is saved until the user confirms, and the server checks everything again on confirm. Models and fields are defined in the [data model](../domain/data-model.md); payees and rules in the [rules and payees flow](rules-payees.md).

**Decisions:** D-05 (dynamic mapper for xlsx and csv), D-06 (stateless preview, re-validated on confirm, [ADR-0004](../adr/0004-stateless-import-staging.md)), D-13 (category sources in order: rules, payee default, bank category mapping), D-14 (parsing, mapping, rules, deduplication and preview in the core, [ADR-0005](../adr/0005-python-science-service-rest.md)), D-15 and D-43 (named templates, a default template per account, account chosen at upload), D-16 (layered deduplication, nothing dropped silently, [ADR-0007](../adr/0007-layered-deduplication.md)), D-22 (payee from a column or from cleanup and rules; proposals, never silent), D-23 (rules applied in every preview), D-24 (transfer suggestions confirmed by the user), D-30 (calendar date and optional time), D-48 (every query scoped to the user), D-59 (amounts in cents), D-65 (no transaction before the starting balance), D-79 (names ignore case).

## Behaviour

### Uploading a file

The user uploads one file for one account, chosen at upload: the account is never deduced from the file or from a category (D-15). The file is xlsx or csv (D-05). The template that reads it is, in order (D-15, D-43):

1. the template the user chose for this upload;
2. otherwise, the account's default template (`Account.defaultImportTemplateId`);
3. otherwise, a template proposed by the system;
4. otherwise, the user maps the columns by hand in the preview, and can save the mapping as a new template.

[NEEDS CLARIFICATION: Does the system's proposal (step 3) exist in the MVP, and how does it work? D-15 makes automatic recognition the last resort. Proposal: in the MVP, the system compares the file's header row with the header saved on each of the user's templates (`ImportTemplate.headerSignature`) and proposes the template whose header matches exactly; it never applies it without showing it. Alternatives: no proposal in the MVP (the user picks or maps by hand), or a fuzzy match on similar headers.]

### Import templates

A template is a named mapping of one bank's file, reusable across accounts (D-15, D-43). It records:

- where the rows start (`ImportTemplate.startRow`), and the csv delimiter;
- which column holds each field (`ImportTemplate.columns`): the date (required), the time, the amount (required, as one signed column or as two columns for money in and money out), the description (required), the payee, the bank's category, the bank's transaction ID;
- how dates and amounts are written (`ImportTemplate.dateFormat`, `ImportTemplate.decimalSeparator`), and the sign convention (`ImportTemplate.signConvention`): a signed amount, a signed amount to flip, or separate in and out columns;
- the mapping from the bank's category values to the user's categories (`ImportTemplate.categoryMappings`), such as "Spesa supermercato" → "Food › Groceries".

Template names follow the rule for names the user sees: unique per user, ignoring case and surrounding spaces (D-79). Deleting a template sets the default template of the accounts that used it to `null`.

[NEEDS CLARIFICATION: Can a template map a notes column? Actual Budget can import notes from a file. Proposal: yes, an optional notes column that fills `Transaction.notes`, which a rule can still set (D-23, D-78).]

### Reading and validating the rows

Each row is read with the template and turned into a candidate transaction: calendar date, optional local time (D-30), amount in cents (D-59), description, and the optional bank ID, bank category and payee text. A row that cannot be read is an **error row**: it shows the reason ("date 31/02/2026 is not a valid date", "amount 12,3,4 is not a number") and the original values. It is never read as 0, as an empty date or as today, and it cannot be confirmed until the user fixes it or discards it. Empty rows at the end of the file are skipped and counted.

A row dated before the account's starting balance is flagged and cannot be confirmed as it is ([balances flow](balances.md#opening-an-account), D-65): the user discards it, or first moves the starting balance back.

[NEEDS CLARIFICATION: What happens to rows the bank marks as not booked yet (Fineco's "Contabilizzazione" column)? v1 imports them. Their date and description can change when the bank books them, so importing them now risks a duplicate later. Proposal: a template can map a booking status column and the value that means "not booked"; such rows are shown in the preview, deselected, with the label "not booked yet"; the user can still select them. Alternatives: imported like any row, or never shown.]

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

[NEEDS CLARIFICATION: How is the exact hash composed, and how do two legitimate identical rows in one file (two coffees of 1.20 on the same day) stay apart? Proposal: a SHA-256 of the date, the time when the template maps one, the amount in cents, the description as read, and the row's occurrence number among the identical rows of the same file (1 for the first coffee, 2 for the second). The hash is computed on the row as read, before the user edits it, so a re-import still recognises it. A re-import of an overlapping file gives the same numbers, so both coffees are recognised again.]

[NEEDS CLARIFICATION: What can the user do with each kind of duplicate? Proposal: a bank ID or exact hash match is "already imported", deselected, and cannot be imported again (the unique constraints would reject it); the user can only leave it out. A possible duplicate offers three choices: merge it with the existing transaction (the default), import it as a new transaction, or discard it.]

[NEEDS CLARIFICATION: How wide is the window of the approximate match, and which candidate is chosen when several match? ADR-0007 leaves N to this document; Actual Budget uses 7 days before and after, prefers a candidate with the same payee, then the nearest date, and matches each existing transaction at most once. Proposal: the same as Actual Budget, 7 days, with the same preferences. The same window serves the transfer suggestion below. A narrower window (3 days) misses more manual entries; a wider one flags more recurring payments.]

### Merging a row with an existing transaction

When the user merges a row with the transaction it matches, one transaction remains: the existing one, completed with the bank's data. A merged generated transfer side stays linked to its pair (D-24).

[NEEDS CLARIFICATION: Which fields does the merge take from the bank, and which stay as the user set them? Actual Budget keeps the existing payee, category and notes when they are set, takes them from the row only when they are empty, always takes the bank's ID and imported payee, and keeps the existing date unless an option says otherwise. Proposal: the same for payee, category and notes; `bankId`, `importHash`, `description` and `importedPayee` always from the bank; the date and the time from the bank too, because the bank's date is what reconciliation compares against (D-67, D-68); for a transfer side, the date changes only on that side (D-73).]

### Transfer suggestions

The preview suggests that a row is one side of a transfer when (D-24):

- a rule marks it as a transfer to an account (D-23); or
- another of the user's accounts has a transaction with the opposite amount within the window, which is not already a transfer.

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

[NEEDS CLARIFICATION: What happens when the re-validation on confirm differs from the preview (another import added a duplicate meanwhile, a category in the rows was deleted, the account was closed)? Proposal: nothing is saved; the confirm answers 409 Conflict with a new preview of the same rows, so the user reviews the differences. Saving only the rows that still hold would import part of a file silently.]

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

## Edge cases

- **A file for the wrong account:** the template matches but every row is new; nothing tells the account apart, so the user must check the preview. A starting balance after the rows' dates flags them all (IMP-14).
- **The same file imported twice:** every row is already imported (IMP-8).
- **Two identical rows in one file:** both are new (IMP-9).
- **An overlapping file** (October, then October and November): October's rows are already imported, November's are new (IMP-8).
- **A row that matches a generated transfer side:** a possible duplicate, merged by default ([TRF-4](transfers.md#trf-4--importing-the-other-side-later-merges-it-with-the-generated-one)).
- **A possible duplicate the user imports as new:** both transactions stay; the user takes responsibility for it.
- **An empty file, or one with only a header:** an empty preview, nothing to confirm.

## Divergences from Actual Budget

1. **Templates are named and shared across accounts.** Actual Budget remembers the csv settings of each account; here a template has a name, can serve several accounts of the same bank, and an account has a default one (D-15, D-43).
2. **Layered deduplication.** Actual Budget matches by imported ID and then approximately; here the exact hash adds a certain layer for re-imports of files without IDs (D-16, [ADR-0007](../adr/0007-layered-deduplication.md)).
3. **Category sources in a fixed order, shown per row** (D-13).
4. **The server re-validates on confirm.** Actual Budget's preview and import run in the same local application; here the client is not trusted (D-06, [ADR-0004](../adr/0004-stateless-import-staging.md)).

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
