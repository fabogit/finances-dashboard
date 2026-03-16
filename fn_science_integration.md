# Science Service Integration (Python/FastAPI)

This document details the communication protocol and processing logic delegated to the Python service.

## ⚙️ Configuration

The service is contacted via NestJS's `HttpService`. The URL is configurable via an environment variable:
`SCIENCE_SERVICE_URL` (default: `http://backend-science:8000`)

---

## 📡 Exposed Endpoints

### 1. `POST /process`

Used during Excel file uploads to "clean" and categorize movements.

- **Input**: Array of `RawTransaction`.
- **Logic**:
  - String normalization (trimming spaces, casing).
  - Advanced date and amount parsing.
  - **Categorization**: Mapping the description to the `Category` tree implemented in the DB.
- **Output**: Array of `ProcessedTransactionDto`.

### 2. `POST /forecast`

Used to generate 3-month financial forecasts.

- **Input**: Transaction history and `std_deviation_threshold` (to filter anomalies).
- **Logic**:
  - Aggregation by month and category.
  - Trend calculation (Moving Average or more complex models in Python).
- **Output**: Forecasts for Income, Expenses, and expected Cash Flow.

### 3. `POST /goals/projection`

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

## 🛠️ Data Treatment (Data Cleaning)

The Python service applies several transformations:

1.  **Date Alignment**: Converts heterogeneous date formats (e.g., `29.12.2024` or `12/29/24`) to ISO standards.
2.  **Amount Normalization**: Handles thousands and decimal separators (`,` vs `.`) ensuring decimal precision.
3.  **Operation Cleaning**: Removes superfluous bank codes from descriptions (e.g., `WIRE TRANSFER FROM...` -> `Salary`).

---

## 🚑 Resilience and Fallback

The `ScienceService` in the backend core implements a protection mechanism:

- If the Python service does not respond, the import **does not fail**.
- The system still saves the `RawTransactions`.
- A status of `science: failed` is returned, signaling that automatic enrichment was not performed, and the transactions will remain "Unclassified" until manual intervention or future recalculation.

---

## ✅ Quality Assurance

Every core component of the Science Service is covered by an automated `pytest` suite:

- **Rule Validation**: Ensures mapping correctness for bank labels.
- **Transformation Tests**: Verifies Pandas-based data cleaning for amounts and dates.
- **Algorithm Verification**: Unit tests for Linear Regression projections and Goal ETAs.

Verification is automatically performed in the global CI/CD pipeline on every modification to the module.
