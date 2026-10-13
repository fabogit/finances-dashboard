# Science Service Integration (Python/FastAPI)

This document details the communication protocol and processing logic delegated to the Python service.

---

## ⚙️ Configuration & Structure

The Python code is modularized within the `src/` directory (e.g., `src/modules/processor.py`).
The service is run via uvicorn targeting `src.main:app`.
It is contacted via NestJS's `HttpService`. The URL is configurable via an environment variable:
`SCIENCE_SERVICE_URL` (default: `http://backend-science:8000`)

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

## 🚑 Resilience and Fallback

The `ScienceService` proxy in the NestJS backend core implements a protection mechanism:
- If the Python service does not respond or is offline:
  - Staging does not fail.
  - A status of `science: failed` is returned.
  - Transactions are presented to the user in the staging grid with categories set to `null` ("Unclassified"). The user can manually classify them or retry the AI analysis later.
- If the forecaster fails, NestJS falls back to presenting only the fixed subscriptions as future projections.

---

## 🔄 Migration Plan: `/forecast` → `/forecast/trend` + `/forecast/recurrence`

The separation of the forecast endpoints is designed to enable:
1. **Parallelism**: NestJS calls both endpoints simultaneously via `Promise.all`.
2. **Flexibility**: User-selectable parameters (`lookbackMonths`, `monthsToPredict`, `stdDeviationThreshold`).
3. **Testability**: Each endpoint has an independent, well-defined contract.
4. **Guard-rail**: NestJS combines results — if linear prediction estimates total spending below fixed costs, variable spending is clamped to 0.

Full design details in [2026-05-31_system.md](../docs/2026-05-31_system.md) (Section 3.4).
