"""
Finance Science Service API.

This module defines the FastAPI application entry point for the Finance Science Service.
It provides HTTP endpoints to validate raw financial transaction data, orchestrate
the cleaning process via the DataProcessor, and generate financial forecasts using
the Forecaster service.

Key Components:
    - Input/Output DTOs: Pydantic models for strict data validation.
    - Endpoints: REST interfaces for health checks, data processing, and forecasting.
"""
import logging
import traceback
from typing import Optional, Union, cast
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from processor import DataProcessor, RawTransactionInput
from forecaster import Forecaster, TransactionInput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Finance Science Service")

# --- OUTPUT DTOs ---


class ProcessedTransactionDto(BaseModel):
    """
    Represents the cleaned and typed transaction data ready for analysis.

    Attributes:
        id (str): Unique identifier for the transaction.
        date (str): Standardized ISO 8601 date string (YYYY-MM-DD).
        operation (str): The type of operation performed.
        details (str): Cleaned details or description.
        account (str): The associated account identifier.
        amount (float): The transaction amount converted to a float.
        category (str): Assigned macro-category label.
        subCategory (str): Assigned sub-category label (English).
    """
    id: str
    date: str          # e.g., "2025-12-29" (ISO Format)
    operation: str
    details: str
    account: str
    amount: float      # e.g., -747.6
    category: str
    subCategory: Optional[str] = None


class ForecastFlowDto(BaseModel):
    """
    Represents the breakdown of a financial flow (Income or Expense).

    Attributes:
        total (float): The predicted total amount for this flow type.
        fixed (float): The portion of the total attributed to recurring/fixed costs.
        variable (float): The portion of the total attributed to variable/trend-based costs.
    """
    total: float
    fixed: float
    variable: float


class MonthlyForecastDto(BaseModel):
    """
    Represents the financial forecast for a specific future month.

    Attributes:
        date (str): The target month for the forecast in "YYYY-MM" format.
        income (ForecastFlowDto): Predicted details for income.
        expense (ForecastFlowDto): Predicted details for expenses.
        balance (float): The predicted net balance (Income + Expense).
    """
    date: str
    income: ForecastFlowDto
    expense: ForecastFlowDto
    balance: float

# --- INPUT DTOs ---


class RawTransactionDto(BaseModel):
    """
    Represents the raw transaction data received from external sources.

    This model handles incoming data that may not yet be strictly typed,
    such as dates in Excel serial format or amounts as strings.

    Attributes:
        importBatchId (str): Identifier for the bulk import batch.
        originalLine (int): Line number from the source file (used for ID generation).
        date (str): Raw date string (e.g., Excel serial date "46020").
        operation (str): The type of operation performed.
        details (str): Specific details or description of the transaction.
        account (str): The associated account identifier.
        amount (str): The transaction amount as a string (e.g., "-747.6").
        category (Optional[str]): Optional category label for the transaction.
    """
    # id: str
    importBatchId: str
    originalLine: int
    date: str          # e.g., "46020"
    operation: str
    details: str
    account: str
    amount: str        # e.g., "-747.6"
    category: Optional[str] = None
    model_config = ConfigDict(extra='ignore')


class ForecastRequest(BaseModel):
    """
    Input payload for the forecast endpoint.
    Contains the transaction history and configuration parameters.
    """
    transactions: list[ProcessedTransactionDto]
    std_deviation_threshold: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="Threshold (0.0-1.0) to identify fixed expenses. Higher = looser detection."
    )


class GoalProjectionRequest(BaseModel):
    """
    Input payload for the goal projection endpoint.
    """
    transactions: list[ProcessedTransactionDto]
    target_amount: float
    current_amount: float


class GoalProjectionResponse(BaseModel):
    """
    Response structure for goal completion projections.
    """
    estimated_date: Optional[str] = None
    monthly_avg: Optional[float] = None
    months_remaining: Optional[float] = None
    confidence: Optional[str] = None
    error: Optional[str] = None

# --- ENDPOINTS ---


@app.get("/health")
def health_check():
    """
    Performs a health check to verify the service status.

    Returns:
        dict: A dictionary containing the status and service name.
    """
    return {"status": "healthy", "service": "backend-science"}


@app.post("/process", response_model=list[ProcessedTransactionDto])
async def process_transactions(transactions: list[RawTransactionDto]):
    """
    Receives raw transactions, cleans them with Pandas, and returns typed data.

    This endpoint acts as a bridge between raw input and the data science logic
    encapsulated in the DataProcessor. It handles parsing, validation, and categorization.

    Args:
        transactions (list[RawTransactionDto]): A list of raw transaction objects
            containing unformatted data (e.g., string dates, string amounts).

    Returns:
        list[ProcessedTransactionDto]: A list of processed transaction objects
            with standardized dates (ISO format) and numeric amounts.

    Raises:
        HTTPException: If an error occurs during the data cleaning or processing phase
            (returns status code 500).
    """
    try:
        logger.info("Received %s transactions to process", len(transactions))

        # Pydantic returns dict[str, Any], but DataProcessor expects list[RawTransactionInput].
        # We use cast because we know the structure is compatible.
        raw_list = [t.model_dump() for t in transactions]

        cleaned_data = DataProcessor.clean_transactions(
            cast(list[RawTransactionInput], raw_list)
        )

        logger.info("Processing completed successfully")
        return cleaned_data

    except Exception as e:
        traceback.print_exc()  # Print stack trace to docker logs for debug
        logger.error("Error while processing transactions: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/forecast", response_model=Union[list[MonthlyForecastDto], dict[str, str]])
def forecast_transactions(payload: ForecastRequest):
    """
    Predicts financial flows for the next 3 months based on transaction history and configuration.

    It utilizes the Forecaster service which applies:
    - Linear Regression for variable cost trends.
    - Statistical analysis (variance/frequency) for fixed/recurring costs.

    Args:
        payload (ForecastRequest): Input object containing:
            - transactions (list[ProcessedTransactionDto]): list of cleaned and enriched transactions.
            - std_deviation_threshold (float): Configurable threshold (0.0-1.0) for identifying fixed expenses.
              Higher values make the detection looser/more inclusive.

    Returns:
        Union[list[MonthlyForecastDto], dict[str, str]]:
            - A list of 3 monthly forecasts (Income, Expense, Balance) on success.
            - An error dictionary (e.g., {"error": "..."}) if data is insufficient.
    """
    transactions = payload.transactions

    # 2. Convert Pydantic Models to generic Dicts
    raw_data = [t.model_dump() for t in transactions]

    # 3. Strict Typing
    typed_data = cast(list[TransactionInput], raw_data)

    try:
        # 4. Pass BOTH data AND the threshold to the Forecaster
        result = Forecaster.predict_next_3_months(
            typed_data,
            std_deviation_threshold=payload.std_deviation_threshold
        )
        return result
    except Exception as e:
        traceback.print_exc()
        logger.error("Forecast failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/goals/projection", response_model=GoalProjectionResponse)
def project_goal(payload: GoalProjectionRequest):
    """
    Predicts the expected completion date for a savings goal based on historical transaction data.

    This endpoint calculates the monthly savings velocity (including trends) and
    estimates how many months are remaining to reach a target amount.

    Args:
        payload (GoalProjectionRequest): Input object containing:
            - transactions (list[ProcessedTransactionDto]): History of cleaned transactions.
            - target_amount (float): The target savings goal amount.
            - current_amount (float): The current amount already saved.

    Returns:
        GoalProjectionResponse: An object containing the estimated completion date,
        monthly average savings, months remaining, and a confidence level indicator.
    """
    try:
        raw_data = [t.model_dump() for t in payload.transactions]
        typed_data = cast(list[TransactionInput], raw_data)

        result = Forecaster.predict_goal_eta(
            typed_data,
            target_amount=payload.target_amount,
            current_amount=payload.current_amount
        )

        return cast(dict, result)

    except Exception as e:
        traceback.print_exc()
        logger.error("Goal projection failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
