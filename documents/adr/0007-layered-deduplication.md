# ADR-0007: Layered deduplication

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decisions:** D-16

## Context

In v1 a duplicate is detected by an exact SHA-256 hash of `date|amount|details|account|operation`, unique across the whole database:

- manual transactions have no hash, so a later import of the same movement creates a duplicate;
- two identical legitimate movements (two 1.20 coffees on the same day) collide, and a duplicate inside the same file makes the whole batch fail;
- a different amount format changes the hash;
- two users importing the same file collide, because the hash is global.

**Example.** On 3 October "Fuel −50" is entered by hand. On 10 October the statement is imported and contains "PAGAMENTO POS ENI 1234 −50.00" with booking date 4 October.

## Decision

Duplicates are detected **in layers**, from certainty to suggestion:

1. **Bank ID**, when the file has a unique transaction ID column mapped by the template.
2. **Exact hash**, for re-imports of the same file. The hash includes **date and time** when the template maps a time column: payments with identical date and time are rare, though not impossible.
3. **Approximate match**: same account, same amount, date within ± N days. N is defined in the import flow document. This is a *suggestion*: in the example, the manual "Fuel −50" is proposed as the duplicate of the ENI row.

Uniqueness is **per account**, not global. Every duplicate found is **shown in the preview** ([ADR-0004](0004-stateless-import-staging.md)), where the user can edit or delete the rows before confirming. Nothing is discarded silently.

## Alternatives considered

- **Exact hash only, scoped per account or user.** Rejected: it does not solve the real cases, manual entries and legitimate identical movements.
- **Approximate match only (as in Actual Budget).** Not enough alone: it covers manual entries, but it gives up the certainty of bank IDs and exact re-imports and can flag recurring identical amounts (the same subscription every month) when they fall inside the date window.

## Consequences

- More logic than a single hash, and the template mapper needs a "bank ID" column and an optional time column (D-15, D-30).
- The approximate match is also what recognises the generated side of a transfer when the other account is imported later (D-24), so transfers depend on it.
- The v1 global unique constraint on `transactionHash` goes away; constraints are scoped per account, and every model also carries `userId` ([ADR-0001](0001-userid-on-all-models.md)).
- The user always decides on duplicates; the preview must make each layer's match visible.
