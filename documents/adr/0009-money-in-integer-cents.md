# ADR-0009: Money in integer cents

- **Status:** Accepted
- **Date:** 2026-11-09 (rounding 2026-11-12)
- **Decisions:** D-59, D-102

## Context

v1 keeps money as decimals end to end: `Decimal(10,2)` amounts and `Decimal(15,2)` balances in PostgreSQL, `Prisma.Decimal` in the core, a pair of decorators (`@ParseDecimal`, `@SerializeDecimal`) to carry decimals through the API, and pandas in the computation service. The protocol leaks at every boundary: the Python service serialises its decimals as JSON strings while the core's DTOs declare them as `number`, so callers must parse them rather than trust the type, and the v1 analytics sum with `toNumber()`, in floating point.

Actual Budget, the reference model ([ADR-0002](0002-actual-budget-reference-model.md)), stores every amount as an integer number of cents and formats it only for display.

**Example.** An account opened with 0.10, then +0.20 and −0.30 on the same day. As integers, `10 + 20 − 30` is exactly `0`. As JavaScript numbers, `0.1 + 0.2 − 0.3` is `5.55e-17`; as decimals it is right only if every layer, the JSON included, keeps the decimal type ([data model DM-3](../domain/data-model.md#dm-3--amounts-are-exact)).

## Decision

**Every amount is an integer number of cents**, as in Actual Budget.

- **In the database** a money column is an `Int` (32 bits). Every value computed from amounts, such as a balance or a total, is in cents too.
- **In the core, the API and the computation service** amounts stay integers in cents: a `number` in TypeScript, an `int` in Python, an integer in JSON. No decimal type and no serialisation protocol.
- **The client** turns cents into euros for display, in one place.
- **Only EUR** in the MVP, recorded on `Account.currency` (D-07).
- **Rounding** (D-102): an amount computed from a percentage or an average is rounded to the cent, halves up, like Actual's `Math.round`. Thresholds compare exact integers, never rounded values ([budget flow § Rounding](../flows/budget.md#rounding)).

## Alternatives considered

- **Keep `Decimal(15,2)`** with `Prisma.Decimal`. Rejected: every layer must keep the decimal type, JSON has none, so the protocol of v1 stays, with its parsing at each boundary and its silent fallbacks to floating point.
- **`BigInt` in cents.** Rejected for now: `JSON.stringify` throws on `BigInt`, so every response needs a conversion, and personal finance amounts fit in 32 bits per row.
- **Cents only in the database**, decimals above it. Rejected: the conversions move to the boundaries of the core, and so do the bugs.

## Consequences

- One amount on one row is limited to 21,474,836.47. A property worth more than that on one row would need `BigInt` columns; not expected in the MVP.
- Sums are exact integer arithmetic, but `SUM` and `SUM() OVER` on `Int` columns return `bigint` in PostgreSQL, which Prisma's raw queries return as `BigInt`. A total is cast to `bigint` and converted with `Number()`, exact up to 2^53; never `::int` on a total, which overflows beyond 21,474,836.47 (a Net Worth with a property can) ([database delegation workflow](../../.agents/workflows/database-delegation-flow.md)).
- `@ParseDecimal` and `@SerializeDecimal` disappear as the modules are rebuilt (D-37); input validation checks integers and their range.
- The client formats money in one place; nothing else turns cents into euros.
- The computation service receives and returns integers ([science contract § Types](../architecture/science-contract.md#types)).
