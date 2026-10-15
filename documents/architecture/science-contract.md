# Science service contract

The HTTP contract between `backend-core` (NestJS) and `backend-science` (FastAPI). Python is a computation service, optional and degradable ([ADR-0005](../adr/0005-python-science-service-rest.md)); this document describes what is exchanged and what happens when the call fails.

A change to an endpoint or a Pydantic model updates, in the same pull request, this document and the TypeScript DTOs in `backend-core/src/modules/science/`.

## Configuration

- The core calls Python through `ScienceService` (`backend-core/src/modules/science/`), configured by environment variables validated at startup:

  | Variable | Default | Meaning |
  | --- | --- | --- |
  | `SCIENCE_SERVICE_URL` | `http://backend-science:8000` | Base URL of the Python service: the container name in Compose, `http://localhost:8000` when running locally |
  | `SCIENCE_TIMEOUT_MS` | `10000` | Timeout of each attempt, in milliseconds (integer ≥ 1) |
  | `SCIENCE_RETRY_COUNT` | `2` | Retries after the first attempt, for transient failures only (integer ≥ 0) |

  The defaults, and the reasons behind them, live in `science.constants.ts`.
- The service runs with uvicorn on `src.main:app`, port 8000. Interactive docs at `/docs` and `/redoc`.
- Its version is `__version__` in `backend-science/src/main.py`, kept equal to the repository version (D-42).

## Endpoints

### `GET /health`

Returns `{ "status": "healthy", "service": "backend-science" }`.

### `POST /forecast`

Forecast of income, expenses and balance for the next three months. Called by `GET /analytics/forecast` in the core.

- **Input:** `{ "transactions": [ProcessedTransaction], "std_deviation_threshold": 0.2 }`. The threshold (0.0–1.0) decides how loosely a recurring expense counts as fixed.
- **Logic:** monthly totals with a linear-regression trend; recurring items (at least three occurrences with low variance) are the fixed part; variable = total − fixed.
- **Output:** a list of `{ "date": "YYYY-MM", "income": Flow, "expense": Flow, "balance": Decimal }`, where `Flow` is `{ "total", "fixed", "variable" }`.
- **v2:** kept, with its input filtered by transaction kind: `REGULAR` plus transfers that cross the on/off-budget boundary (D-35, [ADR-0008](../adr/0008-transaction-kind.md)).

### `POST /goals/projection`

Estimated completion date of a savings goal. Called by `GET /goals/:id/projection` in the core.

- **Input:** `{ "transactions": [ProcessedTransaction], "target_amount": Decimal, "current_amount": Decimal }`.
- **Logic:** linear regression on the goal's recent history gives a monthly saving velocity; high variance lowers the confidence. The months remaining are capped at 1,200, beyond which the date is reported as unreachable.
- **Output:** `{ "estimated_date", "monthly_avg", "months_remaining", "confidence", "error" }`, all optional.

### `POST /process` (v1 only)

Cleans and categorises raw import rows: dates (including Excel serial dates), amounts, and a category from a static dictionary on the bank's category label.

- **Input:** a list of `{ "importBatchId", "originalLine", "date", "operation", "details", "account", "amount", "category" }`, all strings except `originalLine`.
- **Output:** a list of `ProcessedTransaction`: `{ "id", "date" (ISO), "operation", "details", "account", "amount" (Decimal), "category", "subCategory" }`.
- **Retired in v2:** parsing, mapping and categorisation move to the core ([ADR-0005](../adr/0005-python-science-service-rest.md)); the endpoint disappears with the v1 import.

## Types

Python serialises `Decimal` values as JSON strings, while the core's DTOs type them as `number`. Callers must parse them as decimals, not trust the declared type.

## Failure handling

Every call from the core to Python goes through the same path in `ScienceService` (issue #85).

**Timeout.** Each attempt has a timeout of `SCIENCE_TIMEOUT_MS`, covering the whole request. A timed-out attempt is **not** retried, so a call that exceeds the timeout fails after roughly `SCIENCE_TIMEOUT_MS`.

**Retry.** All three endpoints (`/process`, `/forecast`, `/goals/projection`) are stateless computations, so repeating a call is safe. Only transient failures are retried, up to `SCIENCE_RETRY_COUNT` times, with exponential backoff (200 ms, 400 ms, …):

| Failure | Retried |
| --- | --- |
| Network error (connection refused or reset, DNS failure) | Yes |
| Response `502`, `503`, `504` | Yes |
| Timeout | No |
| Any other `4xx` or `5xx` response (for example `422` validation, `500` crash) | No |

**Errors.** When the last attempt fails, the call becomes an HTTP error. Bodies follow the format of the global exception filter; the `error` field carries a stable code:

| Cause | Status from the core | `error` |
| --- | --- | --- |
| Timeout | `504 Gateway Timeout` | `SCIENCE_TIMEOUT` |
| Service unreachable (network error after the retries) | `503 Service Unavailable` | `SCIENCE_UNAVAILABLE` |
| Service answered with an error (any status, including `502` / `503` / `504` after the retries) | `502 Bad Gateway` | `SCIENCE_BAD_RESPONSE` |

Example, `GET /api/v1/analytics/forecast` with the Python service stopped:

```json
{
  "statusCode": 503,
  "timestamp": "2026-10-15T13:00:00.000Z",
  "path": "/api/v1/analytics/forecast",
  "message": "Science service unreachable on /forecast: ECONNREFUSED",
  "error": "SCIENCE_UNAVAILABLE"
}
```

**Per endpoint today:**

- **Forecast** (`GET /analytics/forecast`) and **goal projection** (`GET /goals/:id/projection`) answer the errors above; a failure of the call is never returned as `200 {error}`.
- **"No result" outcomes are not failures yet.** When the history is too short, the dates are invalid or the goal cannot be reached, Python answers `200` with `{ "error": "..." }` and the core passes it through unchanged. The same holds for the forecast when the database has no transactions in the period (`{ "error": "No data available in DB for forecast" }`, without calling Python).
- **Upload** (`POST /transactions/upload`) does not fail: the raw transactions are saved, `/process` errors are caught, and the response reports `science.status: "failed"` with the error message. No enriched transactions are created for that batch.

**Planned:**

- **"No result" outcomes, D-49** (implemented with #96 or the forecast and goals issues):
  - insufficient history → `422` with `error: "INSUFFICIENT_DATA"`, in the global error format; the core translates it, because with the mapping above a 4xx from Python would become 502;
  - a goal that cannot be reached at the current pace → `200` with an explicit outcome (for example `status: "UNREACHABLE_AT_CURRENT_PACE"`, projection fields `null`): it is information for the user, not an error;
  - "No valid dates in data" → an internal error (502), since the core always sends ISO dates.
- **`ScienceClient`, issue #96 (D-21):** an interface that hides the transport and adds a circuit breaker to the timeout and retry above. When Python is unavailable, features that depend on it degrade (no forecast, no suggestion) and everything else keeps working.

## Post-MVP proposal: forecast split

Issue #77 (Backlog) proposes replacing the single `/forecast` with two endpoints, called in parallel by the core:

- **`POST /forecast/trend`:** linear regression on monthly totals already aggregated by the core (`{ "monthly_totals": [{ "date": "YYYY-MM", "total" }], "months_to_predict" }`), about 12–24 objects instead of thousands of transactions.
- **`POST /forecast/recurrence`:** fixed and variable recurring expenses from a minimal transaction history (date, amount, details, category), adjusted by the user's subscriptions: an active subscription overrides the statistical guess; a paused one removes its matching history.
- The core combines the two; if the trend predicts total spending below the fixed costs, the variable part is clamped to 0.

Who suppresses paused subscriptions is still open ([product/open-questions.md](../product/open-questions.md#who-suppresses-paused-subscriptions-in-the-forecast)).
