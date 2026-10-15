# ADR-0005: Python as a computation service, REST behind `ScienceClient`

- **Status:** Accepted
- **Date:** 2026-10-09
- **Decisions:** D-14, D-21

## Context

In v1 the boundary between the two services is blurred. Node reads the `.xlsx` file; Python parses dates and amounts and categorises rows with a static dictionary on the bank's category label; Python also computes the forecast and the goal projections. A bug can sit in Node, in Python or in the contract between them: for example an unparsable date silently becomes `''` and an unparsable amount silently becomes `0`.

With a dynamic mapper ([ADR-0002](0002-actual-budget-reference-model.md)) and a stateless preview ([ADR-0004](0004-stateless-import-staging.md)), rules and payees live in the core's database, so the boundary had to be redrawn. The maintainer also asked whether a message bus (RabbitMQ, Pulsar, Kafka, NATS) should replace REST.

The interactions expected between the services:

| Interaction | Who waits | Duration | Nature |
| --- | --- | --- | --- |
| Category suggestion in the import preview | The user, on screen | < 1 s | Request/reply |
| Forecast, goal projection | The user, opening the dashboard | 1–2 s | Request/reply, cacheable |
| Training the categorisation model | Nobody | Seconds to minutes | Asynchronous job |
| Exchange rates or prices download (future) | Nobody, scheduled | Seconds | Asynchronous job |
| Statistics refresh after an import (future) | Nobody | Seconds | Event |

## Decision

**Python is only a computation service (D-14).** Parsing, mapping, rules, deduplication and the import preview live in the core service (NestJS, TypeScript). Python computes: forecasts, goal projections, later machine-learning suggestions and recurrence analysis. Python is **optional and degradable**: if it is down, the import still works, only without suggestions.

**Transport: robust REST now, behind an interface (D-21).** The core calls Python through a `ScienceClient` interface that hides the transport, with timeouts, retries with backoff and a circuit breaker. **NATS** is introduced behind the same interface when the first truly asynchronous job arrives (model training or scheduled downloads). Kafka and Pulsar are ruled out at this scale.

**Example.** The preview asks Python for suggestions on 120 rows: a POST with a 3-second timeout. If it expires, the preview shows the rows without the suggestion. With NATS it would be a `request("science.categorize", payload, timeout)` with the same behaviour.

## Alternatives considered

Role of Python (D-14):

- **Python as the ingestion engine** (file and mapping in, clean rows out). Rejected: every preview would depend on Python, so Python down means no import; rules and payees would have to be sent to Python on every call.
- **Mixed, as in v1.** Rejected: the blurred boundary is one of the causes of the v1 inconsistencies.

Transport (D-21):

- **REST plus a job queue on Postgres or Redis** (e.g. BullMQ). Rejected for now: two mechanisms, and a queue on a shared database couples the services to it.
- **NATS straight away.** Postponed: one mechanism for sync and async and light to run, but extra infrastructure in Compose and CI with no asynchronous job to justify it yet.
- **RabbitMQ.** Rejected: heavier than NATS, request/reply is awkward.
- **Kafka or Pulsar.** Rejected: event-streaming platforms built for huge volumes; request/reply would need request and reply topics and correlation.

## Consequences

- The Python parsing and static categorisation used by the v1 import (`POST /process`) are retired; robust parsing is written in TypeScript and tested end to end with Jest.
- The whole import flow is in one service; Python can be lost without breaking it.
- `ScienceClient` (issue #96) owns timeouts, retries, the circuit breaker and error mapping; issue #85 first adds timeouts, retries and real HTTP errors for transport failures to the v1 proxy. "No result" outcomes (insufficient data, unreachable goal) get their own responses (D-49, [science contract](../architecture/science-contract.md#failure-handling)).
- The HTTP contract is documented in [`architecture/science-contract.md`](../architecture/science-contract.md).
- When NATS arrives it is one more container in Compose and CI, and a second implementation of the same interface.
