# Science service contract

The HTTP contract between `backend-core` (NestJS) and `backend-science` (FastAPI). Python is a computation service, optional and degradable ([ADR-0005](../adr/0005-python-science-service-rest.md)); this document describes what is exchanged and what happens when the call fails.

A change to an endpoint or a Pydantic model updates, in the same pull request, this document and the TypeScript DTOs in `backend-core/src/modules/science/`.

## Configuration

- The core reads the base URL from `SCIENCE_SERVICE_URL` (default `http://backend-science:8000`, the container name in Compose; `http://localhost:8000` when running locally).
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

**Today (v1):**

- The HTTP client (`HttpModule`) has no timeout and no retry.
- **Transport failures** (Python down, timeout, 5xx) on forecast and goal projection are caught in the proxy and returned as HTTP 200 with a body `{ "error": "..." }`.
- **"No result" outcomes** are also 200 `{ "error": "..." }`, produced by Python itself (`/forecast` and `/goals/projection` return an error object when the history is insufficient, the dates are invalid or the goal cannot be reached) or by the core ("No data available in DB for forecast").
- A `/process` failure during an upload still answers 201, with the science status marked as failed.

**Planned:**

- **Transport failures, issue #85:** timeouts and retries configured from the environment; failures become real HTTP errors (502, 503, 504) instead of 200 `{error}`.
- **"No result" outcomes, D-49** (not in #85; implemented with #96 or the forecast and goals issues):
  - insufficient history → `422` with `error: "INSUFFICIENT_DATA"`, in the global error format; the core translates it, because with the #85 mapping a 4xx from Python would become 502;
  - a goal that cannot be reached at the current pace → `200` with an explicit outcome (for example `status: "UNREACHABLE_AT_CURRENT_PACE"`, projection fields `null`): it is information for the user, not an error;
  - "No valid dates in data" → an internal error (502), since the core always sends ISO dates.
- **`ScienceClient`, issue #96 (D-21):** an interface with timeout, retry with backoff and a circuit breaker. When Python is unavailable, features that depend on it degrade (no forecast, no suggestion) and everything else keeps working.

## Post-MVP proposal: forecast split

Issue #77 (Backlog) proposes replacing the single `/forecast` with two endpoints, called in parallel by the core:

- **`POST /forecast/trend`:** linear regression on monthly totals already aggregated by the core (`{ "monthly_totals": [{ "date": "YYYY-MM", "total" }], "months_to_predict" }`), about 12–24 objects instead of thousands of transactions.
- **`POST /forecast/recurrence`:** fixed and variable recurring expenses from a minimal transaction history (date, amount, details, category), adjusted by the user's subscriptions: an active subscription overrides the statistical guess; a paused one removes its matching history.
- The core combines the two; if the trend predicts total spending below the fixed costs, the variable part is clamped to 0.

Who suppresses paused subscriptions is still open ([product/open-questions.md](../product/open-questions.md#who-suppresses-paused-subscriptions-in-the-forecast)).
