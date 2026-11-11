# Rules and payees

How a bank's text becomes a clean payee, and how the user's rules set the payee, the category, the notes or a transfer. Payees and rules are what makes the import better with use: each correction in the preview can become a payee default or a rule. Models and fields are defined in the [data model](../domain/data-model.md); where rules run during an import is in the [import flow](import.md).

**Decisions:** D-12 (payees and rules in the MVP), D-13 (category sources: rules, payee default, bank mapping), D-22 (payee from a template column or from cleanup and rename rules; proposals, never silent), D-23 (ordered rules, the first that sets a field wins; applied in every preview and, on request with a preview, to existing transactions; never automatically to history), D-29 and D-76 (category deletion moves or removes rule actions and payee defaults), D-48 (every query scoped to the user), D-72 (transfers have no payee; rules mark transfers with their own action), D-79 (names ignore case and surrounding spaces).

## Behaviour

### Payees

A payee is the clean name of who was paid or who paid, such as "Esselunga" (D-12). It can carry a default category (`Payee.defaultCategoryId`), proposed for its transactions when no rule sets one (D-13). Payee names are unique per user, ignoring case and surrounding spaces (D-79). A transfer has no payee (D-72).

A payee is created by the user, or from the import preview when the user accepts a proposed new payee (D-22). Renaming a payee renames it on all its transactions, since they reference it.

[NEEDS CLARIFICATION: What happens when a payee is deleted, or merged into another? Actual Budget lets the user merge payees. Proposal: two operations, each with a preview of the counts, like category deletion (D-29). **Merge** into another payee: its transactions, its rule conditions and rule actions move to the target, and the target keeps its own default category. **Delete** without a target: its transactions keep their imported payee and get no payee; rule actions "set payee" that pointed to it are removed, as for categories (D-76); a rule with a condition on that payee could never match as written, so it is deleted, and the preview lists those rules.]

### Imported payee

The imported payee (`Transaction.importedPayee`) is the bank's text for who was paid, before rules rename it (D-22). It comes from the template's payee column when the file has one; otherwise from the description after a deterministic cleanup, in the core:

- known prefixes are removed, such as "PAGAMENTO POS", "ADDEBITO SDD", "BONIFICO A FAVORE DI";
- card numbers ("CARTA *5678"), dates ("03/10", "03/10/2026") and standalone numeric codes ("1234") are removed;
- spaces are collapsed and trimmed.

"PAGAMENTO POS ESSELUNGA MILANO 1234 CARTA *5678 03/10" becomes "ESSELUNGA MILANO".

[NEEDS CLARIFICATION: Where do the cleanup patterns live? D-22 says they can be tied to the template. Options: (a) one fixed list in the code, with bank-specific cases handled by rename rules; (b) patterns configured on each template; (c) both. Proposal: (a) in the MVP, because rename rules already cover what the fixed list misses, and per-template patterns can be added later without changing the data.]

### Rules

A rule has conditions and actions (D-23):

- **Conditions:** all must hold, or at least one (`Rule.conditionsOp`). Each condition is a field, an operator and a value. The fields: the description, the imported payee, the payee, the amount, the account, the bank's category, the date.
- **Actions:** set the payee, set the category, set the notes, mark as a transfer to an account. A rule has at least one action when it is created.

[NEEDS CLARIFICATION: Which operators exist, and are text comparisons case-sensitive? Actual Budget compares all text ignoring case and offers, for text: is, is not, contains, does not contain, one of, not one of, matches (a regular expression); for amounts: is, is approximately, is between, greater than, less than, with a choice of money in or money out; for dates: is, is approximately, before, after. Proposal: the same operators and the same case rule, without "is approximately", and with "starts with" for text, since bank descriptions usually start with the operation type.]

### Evaluation: the first rule wins, field by field

Rules are evaluated in the user's order (`Rule.position`). For each field, the **first** rule that sets it wins; a later rule can still set other fields (D-23). Each rule sees the fields set by the rules before it, so a rule can rename the payee and a later rule can use that payee to set the category.

With these rules:

1. imported payee contains "ESSELUNGA" → payee "Esselunga";
2. payee is "Esselunga" and amount less than −150.00 → category "Food › Big shopping";
3. payee is "Esselunga" → category "Food › Groceries";

a payment of −180.00 with the imported payee "ESSELUNGA MILANO" gets payee "Esselunga" from rule 1 and category "Food › Big shopping" from rule 2; rule 3 matches but the category is already set (RUL-5).

The preview shows, for each field, which rule set it (D-13).

### Where rules run

- **In every import preview**, on every row (D-23, [import flow](import.md#payee-and-category-of-each-row)).
- **On existing transactions, on request**: the user selects a rule (or all) and a set of transactions; the system shows what would change, field by field, and changes nothing until the user confirms (D-23). Rules never run by themselves on history.

[NEEDS CLARIFICATION: Do rules run when the user creates or edits a transaction by hand? Actual Budget runs them in the register as a transaction is entered or edited, without overwriting the field the user has just changed. Proposal: they run when a transaction is created by hand and fill only the fields the user left empty; editing a transaction does not run them.]

### Proposals in the preview

The system proposes, never decides (D-22):

- a new payee, for an imported payee that matches none;
- a payee's default category, when the user gives a row with that payee a category;
- a rule, when the user renames a payee or sets a category in a way a rule could repeat, such as "imported payee contains ESSELUNGA → payee Esselunga".

Accepted proposals are saved with the confirm of the import, in the same database transaction.

### What rules reference

A rule's conditions and actions can reference a payee, a category or an account. When one of these is deleted:

- **a category:** "set category" actions move to the target category, or are removed with no target; a rule left without actions is kept and shown as having none (D-29, D-76);
- **a payee:** see the clarification in [Payees](#payees);
- **an account:** a forced deletion ([balances flow](balances.md#closing-and-deleting-an-account)) treats rules that reference it like a payee deletion without a target. A closed account keeps its rules, but its transfer action is not suggested while it is closed.

[NEEDS CLARIFICATION: How are conditions and actions stored? Actual Budget keeps them as JSON in two columns of the rule. Options: (a) JSON columns (`Rule.conditions`, `Rule.actions`), validated by the API; (b) child tables, one row per condition and per action, with a foreign key column for each kind of reference (payee, category, account); (c) conditions as JSON, actions as child rows. With JSON, a category or payee deletion must search the JSON for its ID and nothing in the database stops a dangling reference; with child tables, the foreign keys find and protect every reference. Proposal: (b). The same question applies to the template's category mappings ([import flow](import.md#import-templates)): proposal, a child table with a foreign key to the category.]

[NEEDS CLARIFICATION: Does deleting a category also move the template category mappings that point to it? D-29 lists transactions, payee defaults and rule actions. Proposal: yes, they move to the target like payee defaults, or are removed with no target, and the deletion preview counts them.]

## Invariants

- Payee names are unique per user, ignoring case and surrounding spaces (RUL-7).
- For each field, the first rule in the user's order that sets it wins; later rules can still set other fields (RUL-5).
- Rules change existing transactions only on request, after a preview (RUL-6).
- No payee, payee default or rule is created without the user's acceptance (RUL-4).
- No rule or payee points to a deleted category (CAT-5, CAT-6).

## Edge cases

- **Two rules set the same field:** the first in the user's order wins; the preview shows which rule set it (RUL-5).
- **A rule that matches nothing:** it is harmless; no automatic clean-up.
- **A rule with an invalid regular expression:** rejected when it is saved, never at import.
- **Moving a rule** changes `Rule.position` of the rules between the old and the new place; positions stay unique per user.
- **The imported payee is empty after cleanup** (a description made only of a prefix and numbers): the row has no imported payee, and only rules on the description can set its payee.

## Divergences from Actual Budget

1. **The first rule wins, field by field, in the user's order.** Actual Budget runs every matching rule in three stages (pre, default, post) ranked automatically from the most general to the most specific, and a later action overwrites an earlier one. Here the order is the one the user sees, and the first rule that sets a field wins (D-23).
2. **Payee defaults instead of learned category rules.** Actual Budget creates category rules automatically when the user categorises a payee; here the preview proposes a payee default or a rule, and saves nothing silently (D-22).
3. **No transfer payees.** Rules mark a transfer with an action, not with a payee (D-72).

## Examples

### RUL-1 · Deterministic cleanup

- **Given** a template with no payee column
- **When** the rows "PAGAMENTO POS ESSELUNGA MILANO 1234 CARTA *5678 03/10", "PAGAMENTO POS ESSELUNGA VIA FARINI 0099 CARTA *5678 17/10" and "ADDEBITO SDD NETFLIX.COM" are previewed
- **Then** their imported payees are "ESSELUNGA MILANO", "ESSELUNGA VIA FARINI" and "NETFLIX.COM"

### RUL-2 · Rename rules

- **Given** the rules "imported payee contains ESSELUNGA → payee Esselunga" and "imported payee contains NETFLIX → payee Netflix"
- **When** the rows of RUL-1 are previewed
- **Then** their payees are "Esselunga", "Esselunga" and "Netflix"

### RUL-3 · The template's payee column wins over cleanup

- **Given** a template that maps a payee column
- **When** a row with description "PAGAMENTO POS 1234 CARTA *5678" and payee column "Esselunga Milano" is previewed
- **Then** its imported payee is "Esselunga Milano", and the description is not cleaned up

### RUL-4 · Proposals, never silent

- **Given** no payee named "Bar Centrale"
- **When** a row with the imported payee "BAR CENTRALE" is previewed
- **Then** the preview proposes a new payee "BAR CENTRALE"
- **When** the user declines it and confirms
- **Then** the transaction has no payee and keeps the imported payee "BAR CENTRALE"
- **And** no payee was created

### RUL-5 · The first rule wins, field by field

- **Given** the three rules of [Evaluation](#evaluation-the-first-rule-wins-field-by-field), in that order
- **When** a row with the imported payee "ESSELUNGA MILANO" and amount −180.00 is previewed
- **Then** its payee is "Esselunga", set by rule 1
- **And** its category is "Food › Big shopping", set by rule 2
- **When** a row with the same imported payee and amount −60.00 is previewed
- **Then** its category is "Food › Groceries", set by rule 3

### RUL-6 · Applying rules to existing transactions

- **Given** 40 transactions with the imported payee "ESSELUNGA MILANO" and no payee
- **When** the user creates the rule "imported payee contains ESSELUNGA → payee Esselunga"
- **Then** the 40 transactions are unchanged
- **When** the user asks to apply the rule to existing transactions
- **Then** the preview shows the 40 transactions and their new payee
- **And** nothing changes until the user confirms

### RUL-7 · Payee names ignore case

- **Given** payee "Esselunga"
- **When** the user creates payee "esselunga "
- **Then** it is rejected
- **When** a row with the imported payee "ESSELUNGA" is previewed and no rule sets its payee
- **Then** its payee is "Esselunga"

### RUL-8 · A rule marks a transfer

- **Given** accounts "Checking" and "Deposit", and the rule "description contains GIROCONTO → transfer to Deposit"
- **When** the "Checking" row "GIROCONTO VERSO DEPOSITO", −500.00, is previewed
- **Then** it is a suggested transfer to "Deposit", with no payee
- **And** it becomes a transfer only if the user confirms it
