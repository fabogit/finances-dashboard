# Science Service Integration (Python/FastAPI)

This document details the communication protocol and processing logic delegated to the Python service.

---

## ⚙️ Configuration & Structure

The Python code is modularized within the `src/` directory (e.g., `src/modules/processor.py`).
The service is run via uvicorn targeting `src.main:app`.
It is contacted via NestJS's `HttpService` (`ScienceService` in `backend-core/src/modules/science/`). The client is configured through environment variables, validated at startup:

| Variable | Default | Meaning |
|----------|---------|---------|
| `SCIENCE_SERVICE_URL` | `http://backend-science:8000` | Base URL of the Python service |
| `SCIENCE_TIMEOUT_MS` | `10000` | Timeout of each attempt, in milliseconds (integer ≥ 1) |
| `SCIENCE_RETRY_COUNT` | `2` | Retries after the first attempt for transient failures (integer ≥ 0) |

The defaults and the reasons behind them live in `science.constants.ts`. The call contract (timeouts, retries, errors) is described in [Call contract and errors](#-call-contract-and-errors).

---

## 📡 Exposed Endpoints

### 1. `POST /process`

Used during spreadsheet upload staging to "clean", categorize movements, and normalize payee names.

- **Input**: Array of `RawTransaction`.
- **Logic**:
  - String normalization (trimming spaces, casing).
  - Advanced date and amount parsing.
  - **Categorization**: Suggests a category based on the description keyword matches and AI classification.
  - **Payee Extraction**: Suggests a clean normalized payee name (e.g. `"Amazon"` from `"AMZN MKTPLACE EU"`).
- **Output**: Array of `ProcessedTransactionDto`.

---

### 2. `POST /forecast` (Current Implementation)

Single monolithic endpoint that combines trend prediction and recurrence detection.

- **Input**:
  ```json
  {
    "transactions": [...],
    "std_deviation_threshold": 0.2
  }
  ```
- **Logic**:
  - Groups transactions by month → SUM → applies linear regression for trend prediction.
  - Groups transactions by sub-category → aggregate (count, mean, std) for recurrence detection.
  - Combines results into a single forecast response.
- **Output**: Combined forecast with predicted totals and identified fixed expenses.

---

### 3. `POST /forecast/trend` `[PLANNED]`

Replaces the trend portion of the monolithic `/forecast`. Calculates global trend predictions using linear regression over **pre-aggregated** monthly data sent by NestJS (instead of raw transactions).

- **Input**:
  ```json
  {
    "monthly_totals": [
      { "date": "2026-05", "total": -1500.00 },
      { "date": "2026-06", "total": -1650.00 }
    ],
    "months_to_predict": 3
  }
  ```
- **Output**: Predicted overall monthly totals.
- **Key Improvement**: Payload reduced from ~3000 transactions to ~12-24 pre-aggregated objects (~99% reduction).

---

### 4. `POST /forecast/recurrence` `[PLANNED]`

Replaces the recurrence portion of the monolithic `/forecast`. Detects statistical fixed/variable expense patterns and integrates user-defined subscriptions.

- **Input**:
  - `transactions`: Array of historical enriched transactions (minimal fields: date, amount, details, subCategory).
  - `std_deviation_threshold`: Threshold filter for frequency anomalies.
  - `subscriptions`: Array of explicit user subscriptions containing status (`ACTIVE` or `PAUSED`).
- **Logic**:
  - **Match & Override**: For each `ACTIVE` subscription matching a statistical recurrence, Python overrides the statistical guess with the subscription's precise amount.
  - **Active Suppression**: For each `PAUSED` subscription, Python filters out matching historical transactions before running predictions, preventing them from being projected.
- **Output**: List of identified fixed recurrent expenses for the upcoming months.
- **Key Improvement**: Minimal field selection (4 vs 8 fields per transaction, ~50% payload reduction).

---

### 5. `POST /goals/projection`

Used to estimate the completion date (ETA) of a savings goal.

- **Input**:
  - `transactions`: Historical savings movements.
  - `target_amount`: The goal's final target.
  - `current_amount`: Current progress.
- **Logic**:
  - **Trend Analysis**: Uses Linear Regression on historical savings frequency and amount.
  - **Velocity Calculation**: Determines the "savings velocity" (monthly delta).
  - **Confidence Scoring**: Evaluates the variance in history. High variance results in "LOW" confidence.
- **Output**: `{ estimated_date: string, monthly_avg: number, confidence: string }`.

---

## 🚑 Call contract and errors

Every call from NestJS to the Python service goes through the same path in `ScienceService`.

**Timeout.** Each attempt has a timeout of `SCIENCE_TIMEOUT_MS`, covering the whole request. A timed-out attempt is **not** retried, so a call that exceeds the timeout fails after roughly `SCIENCE_TIMEOUT_MS`.

**Retry.** All three endpoints (`/process`, `/forecast`, `/goals/projection`) are stateless computations, so repeating a call is safe. Only transient failures are retried, up to `SCIENCE_RETRY_COUNT` times, with exponential backoff (200 ms, 400 ms, …):

| Failure | Retried |
|---------|---------|
| Network error (connection refused or reset, DNS failure) | Yes |
| Response `502`, `503`, `504` | Yes |
| Timeout | No |
| Any other `4xx` or `5xx` response (e.g. `422` validation, `500` crash) | No |

**Errors.** When the last attempt fails, the call becomes an HTTP error. Bodies follow the global exception filter format; the `error` field carries a stable code:

| Cause | NestJS status | `error` |
|-------|---------------|---------|
| Timeout | `504 Gateway Timeout` | `SCIENCE_TIMEOUT` |
| Service unreachable (network error after the retries) | `503 Service Unavailable` | `SCIENCE_UNAVAILABLE` |
| Service answered with an error (any status, including `502`/`503`/`504` after the retries) | `502 Bad Gateway` | `SCIENCE_BAD_RESPONSE` |

Example (`GET /api/v1/analytics/forecast` with the Python service stopped):

```json
{
  "statusCode": 503,
  "timestamp": "2026-10-15T13:00:00.000Z",
  "path": "/api/v1/analytics/forecast",
  "message": "Science service unreachable on /forecast: ECONNREFUSED",
  "error": "SCIENCE_UNAVAILABLE"
}
```

**Per endpoint:**
- **Forecast** (`GET /analytics/forecast`) and **goal projection** (`GET /goals/:id/projection`) answer the errors above. A failure is never returned as `200 {error}`.
- **Insufficient data is not a failure.** When the history is too short, Python answers `200` with `{ "error": "..." }` and NestJS passes it through unchanged. The same holds for the forecast when the database has no transactions in the period (`{ "error": "No data available in DB for forecast" }`, without calling Python).
- **Upload** (`POST /transactions/upload`) does not fail: the raw transactions are saved, `/process` errors are caught, and the response reports `science.status: "failed"` with the error message. No enriched transactions are created for that batch.

---

## 🔄 Migration Plan: `/forecast` → `/forecast/trend` + `/forecast/recurrence`

The separation of the forecast endpoints is designed to enable:
1. **Parallelism**: NestJS calls both endpoints simultaneously via `Promise.all`.
2. **Flexibility**: User-selectable parameters (`lookbackMonths`, `monthsToPredict`, `stdDeviationThreshold`).
3. **Testability**: Each endpoint has an independent, well-defined contract.
4. **Guard-rail**: NestJS combines results — if linear prediction estimates total spending below fixed costs, variable spending is clamped to 0.

Full design details in [2026-05-31_system.md](../docs/2026-05-31_system.md) (Section 3.4).
