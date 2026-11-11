# Rules and payees

How a bank's text becomes a clean payee, and how the user's rules set the payee, the category, the notes or a transfer. Payees and rules are what makes the import better with use: each correction in the preview can become a payee default or a rule. Models and fields are defined in the [data model](../domain/data-model.md); where rules run during an import is in the [import flow](import.md).

**Decisions:** D-12 (payees and rules in the MVP), D-13 (category sources: rules, payee default, bank mapping), D-22 (payee from a template column or from cleanup and rename rules; proposals, never silent), D-23 (ordered rules, the first that sets a field wins; applied in every preview and, on request with a preview, to existing transactions; never automatically to history), D-29 and D-76 (category deletion moves or removes rule actions and payee defaults), D-48 (every query scoped to the user), D-72 (transfers have no payee; rules mark transfers with their own action), D-79 (names ignore case and surrounding spaces), D-91 (merging and deleting payees; rules that reference a deleted payee or account), D-92 (cleanup patterns), D-93 (operators), D-94 (rules on transactions entered by hand), D-95 (conditions and actions as rows with foreign keys).

## Behaviour

### Payees

A payee is the clean name of who was paid or who paid, such as "Esselunga" (D-12). It can carry a default category (`Payee.defaultCategoryId`), proposed for its transactions when no rule sets one (D-13). Payee names are unique per user, ignoring case and surrounding spaces (D-79). A transfer has no payee (D-72).

A payee is created by the user, or from the import preview when the user accepts a proposed new payee (D-22). Renaming a payee renames it on all its transactions, since they reference it.

A payee can be merged into another, or deleted. Both show a preview of the counts first, like category deletion (D-29), and change nothing until the user confirms (D-91).

- **Merge** into a target payee, such as "ESSELUNGA SPA", created by mistake, into "Esselunga": its transactions, the rule conditions and the rule actions that reference it move to the target. A list "one of" that already holds the target keeps it once. The target keeps its own default category, and takes the merged payee's only when it has none (RUL-11).
- **Delete**, such as "Bar Centrale" after the bar closed: its transactions get no payee and keep their imported payee, so the bank's name is still visible. The preview suggests merging it instead. What the rules do is in [What rules reference](#what-rules-reference) (RUL-12).

### Imported payee

The imported payee (`Transaction.importedPayee`) is the bank's text for who was paid, before rules rename it (D-22). It comes from the template's payee column when the file has one; otherwise from the description after a deterministic cleanup, in the core:

- known prefixes are removed, such as "PAGAMENTO POS", "ADDEBITO SDD", "BONIFICO A FAVORE DI";
- card numbers ("CARTA *5678"), dates ("03/10", "03/10/2026") and standalone numeric codes ("1234") are removed;
- spaces are collapsed and trimmed.

"PAGAMENTO POS ESSELUNGA MILANO 1234 CARTA *5678 03/10" becomes "ESSELUNGA MILANO".

In the MVP the patterns are one fixed list in the code, the same for every bank (D-92). A prefix the list does not know stays in the imported payee: "PAGAMENTO TRAMITE POS ESSELUNGA MILANO" keeps its prefix, and a rename rule such as "imported payee contains ESSELUNGA → payee Esselunga" still gives the right payee. After the MVP, a template can add its own patterns, and the system can suggest them from the user's data: words that recur in most descriptions, and the parts the user removes when renaming a payee. Suggestions are proposals the user accepts, never applied on their own (D-22, #125, [roadmap](../product/roadmap.md#milestones)).

### Rules

A rule has conditions and actions (D-23):

- **Conditions:** all must hold, or at least one (`Rule.conditionsOp`). Each condition is a field, an operator and a value. The fields: the description, the imported payee, the payee, the amount, the account, the bank's category, the date.
- **Actions:** set the payee, set the category, set the notes, mark as a transfer to an account. A rule has at least one action when it is created.

The operators are Actual Budget's, without "is approximately" and with "starts with", since bank descriptions usually start with the operation type (D-93, `RuleOperator`):

| Field | Operators |
| --- | --- |
| description, imported payee, bank's category | is, is not, contains, does not contain, starts with, one of, not one of, matches (a regular expression) |
| payee, account | is, is not, one of, not one of |
| amount | is, is between (both ends included), greater than, less than; on the signed amount, or on money in or money out only, as a positive number |
| date | is, before, after |

Text is compared ignoring case, as in Actual Budget: "contains esselunga" matches "PAGAMENTO POS ESSELUNGA". A regular expression that is not valid is rejected when the rule is saved (RUL-9).

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
- **When the user creates a transaction by hand:** rules run and fill only the fields the user left empty. Editing a transaction does not run them (D-94, RUL-10).

### Proposals in the preview

The system proposes, never decides (D-22):

- a new payee, for an imported payee that matches none;
- a payee's default category, when the user gives a row with that payee a category;
- a rule, when the user renames a payee or sets a category in a way a rule could repeat, such as "imported payee contains ESSELUNGA → payee Esselunga".

Accepted proposals are saved with the confirm of the import, in the same database transaction.

### What rules reference

A rule's conditions and actions can reference a payee, a category or an account. When one of these is deleted:

- **a category:** "set category" actions move to the target category, or are removed with no target; a rule left without actions is kept and shown as having none (D-29, D-76);
- **a payee or an account** (D-91):
  - an **action** that sets it ("set payee", "transfer to") is removed; a rule left without actions is kept and shown as having none, as for categories (D-76);
  - a **condition** on it stays, shown as "deleted payee" or "deleted account", so the rule is not lost and the user decides what to do with it. It is evaluated as a payee or account that no transaction has: "is" and "one of" never hold, "is not" and "not one of" always hold. Removing the condition instead would leave a rule that matches everything;
  - from a list "one of" or "not one of", only that value is removed; the condition is shown as deleted only when its list is empty.

  An account is deleted when it has no transactions, or by a forced deletion ([balances flow](balances.md#closing-and-deleting-an-account)). A closed account keeps its rules, but a transfer to it is not suggested while it is closed; reopened, its rules work again (RUL-13).

Every reference is a foreign key (D-95): conditions (`RuleCondition`, with `RuleConditionReference` for payees and accounts) and actions (`RuleAction`) are rows of their own, so a deletion finds every rule that points to what is deleted, and the database rejects a reference to a row that does not exist.

## Invariants

- Payee names are unique per user, ignoring case and surrounding spaces (RUL-7).
- For each field, the first rule in the user's order that sets it wins; later rules can still set other fields (RUL-5).
- Rules change existing transactions only on request, after a preview (RUL-6).
- No payee, payee default or rule is created without the user's acceptance (RUL-4).
- No rule or payee points to a deleted category (CAT-5, CAT-6).
- No rule action points to a deleted payee or account; a condition on one is kept and never matches it (RUL-12, RUL-13).
- Merging or deleting a payee changes nothing before the user confirms the preview (RUL-11, RUL-12).
- Rules never change a field the user set by hand (RUL-10).

## Edge cases

- **Two rules set the same field:** the first in the user's order wins; the preview shows which rule set it (RUL-5).
- **A rule that matches nothing:** it is harmless; no automatic clean-up.
- **A rule with an invalid regular expression:** rejected when it is saved, never at import.
- **Moving a rule** changes `Rule.position` of the rules between the old and the new place; positions stay unique per user.
- **The imported payee is empty after cleanup** (a description made only of a prefix and numbers): the row has no imported payee, and only rules on the description can set its payee.
- **A payee merged into itself:** rejected; the target is another payee of the same user.
- **A rule whose only condition is on a deleted payee:** it stays and never matches with "is"; the user fixes or deletes it (RUL-12).
- **A rule run on a transaction entered by hand that marks a transfer:** the transfer is a suggestion the user confirms, as in the preview (D-24).

## Divergences from Actual Budget

1. **The first rule wins, field by field, in the user's order.** Actual Budget runs every matching rule in three stages (pre, default, post) ranked automatically from the most general to the most specific, and a later action overwrites an earlier one. Here the order is the one the user sees, and the first rule that sets a field wins (D-23).
2. **Payee defaults instead of learned category rules.** Actual Budget creates category rules automatically when the user categorises a payee; here the preview proposes a payee default or a rule, and saves nothing silently (D-22).
3. **No transfer payees.** Rules mark a transfer with an action, not with a payee (D-72).
4. **Rules run only when a transaction is created by hand,** filling the empty fields. Actual Budget also runs them when a transaction is edited (D-94).
5. **Operators:** "starts with" is added, "is approximately" is not offered (D-93).
6. **Conditions and actions are rows with foreign keys.** Actual Budget stores them as JSON on the rule (D-95).
7. **Merging and deleting payees update the rules.** Actual Budget redirects a merged payee to its target and leaves rules untouched on deletion; here the references move, actions to a deleted payee are removed, and conditions on it are shown as deleted (D-91).

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

### RUL-9 · Operators

- **Given** the rule "description starts with pagamento pos → category Food › Groceries"
- **When** a row with description "PAGAMENTO POS ESSELUNGA MILANO" is previewed
- **Then** its category is "Food › Groceries"
- **When** the user saves a rule with the condition "description matches `ESSELUNGA(`"
- **Then** it is rejected, because the regular expression is not valid

### RUL-10 · Rules on a transaction entered by hand

- **Given** the rules "payee is Esselunga → category Food › Groceries" and "payee is Esselunga → notes Weekly shopping"
- **When** the user creates by hand a transaction with payee "Esselunga", category "Home", and no notes
- **Then** its category is "Home" and its notes are "Weekly shopping"
- **When** the user then changes its payee to "Bar Centrale"
- **Then** its category and notes do not change

### RUL-11 · Merging a payee

- **Given** payee "Esselunga" with default category "Food › Groceries", and payee "ESSELUNGA SPA" with default category "Home" and 12 transactions
- **And** the rules "imported payee contains ESSELUNGA SPA → payee ESSELUNGA SPA" and "payee is ESSELUNGA SPA and amount less than −150.00 → category Food › Big shopping"
- **When** the user asks to merge "ESSELUNGA SPA" into "Esselunga"
- **Then** the preview shows 12 transactions and 2 rules, and nothing has changed
- **When** the user confirms
- **Then** the 12 transactions have payee "Esselunga"
- **And** the rules set payee "Esselunga" and test "payee is Esselunga"
- **And** "Esselunga" keeps default category "Food › Groceries"
- **And** "ESSELUNGA SPA" no longer exists

### RUL-12 · Deleting a payee

- **Given** payee "Bar Centrale" with 8 transactions
- **And** the rules "imported payee contains BAR CENT → payee Bar Centrale", "payee is Bar Centrale → category Food › Bar" and "payee is one of Bar Centrale, Caffè Roma → notes Breakfast"
- **When** the user deletes "Bar Centrale" and confirms the preview
- **Then** the 8 transactions have no payee and keep the imported payee "BAR CENTRALE"
- **And** the first rule has no actions and is shown as such
- **And** the second rule shows its condition as "deleted payee", and never sets "Food › Bar"
- **And** the third rule tests "payee is one of Caffè Roma"
- **When** a row with the imported payee "BAR CENTRALE" is previewed
- **Then** no rule sets its payee, and the preview proposes a new payee "BAR CENTRALE"

### RUL-13 · Rules that reference an account

- **Given** account "Deposit", and the rules "description contains GIROCONTO → transfer to Deposit" and "account is Deposit → category Savings › Interest"
- **When** "Deposit" is closed
- **Then** both rules are unchanged, and a "GIROCONTO" row on "Checking" is not suggested as a transfer
- **When** "Deposit" is reopened
- **Then** the "GIROCONTO" row is suggested as a transfer to "Deposit" again
- **When** "Deposit" is deleted with a forced deletion
- **Then** the first rule has no actions, and the second shows its condition as "deleted account"
