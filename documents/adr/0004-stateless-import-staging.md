# ADR-0004: Stateless import preview

- **Status:** Accepted
- **Date:** 2026-10-08
- **Decisions:** D-06 (design review Q6)

## Context

In v1 an upload is saved straight away. Duplicates are dropped by an exact hash, but manual transactions have no hash and slip through; uncategorised rows and transfers have to be fixed one by one afterwards; any error still answers 201 and leaves raw rows behind.

**Example.** The October statement has 120 rows: 3 are already in the database (entered by hand), 15 have no category, 2 pairs are transfers to the savings account, 1 row is not yet booked by the bank.

## Decision

**Import goes through a stateless preview.**

- The upload returns a preview **without writing anything**: every row with its proposed category and where it came from, duplicates highlighted, suggested transfer pairs.
- The user fixes, discards and confirms in the client.
- The client sends the rows back; the server **re-validates everything**, hashes and balances included, and saves them in one database transaction.

This is close to what Actual Budget does: preview in the client with deduplication and rules applied, then import.

## Alternatives considered

- **(a) Direct import, as in v1 but fixed.** Rejected: mistakes land in balances, goals and analytics at once and cost more to correct; manual duplicates and transfers are handled after the fact.
- **(c) Stateful staging**: rows saved in `ImportBatch` / `StagedTransaction` tables with a `PENDING` state, so a review can be interrupted and resumed, with an audit of every import. Rejected: new tables and states, pending rows to clean up, and every balance and analytics query would have to ignore them. It would become interesting only for rare, very large imports.

## Consequences

- No staging tables; nothing dirty is ever persisted.
- The confirm payload is large, and the server must not trust it: every check runs again on confirm.
- Closing the page loses the review.
- The v1 import bugs are superseded rather than fixed.
- The preview is where the other import decisions surface: the template chosen at upload, then the account's default template, then the system's proposal (D-15, D-43); the category source of each row (D-13); duplicates by layer ([ADR-0007](0007-layered-deduplication.md)); proposed payee defaults and rules, never saved silently (D-22).
- Parsing, mapping, rules, deduplication and the preview all live in the core service ([ADR-0005](0005-python-science-service-rest.md)).
