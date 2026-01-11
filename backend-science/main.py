"""
Finance Science Service API.

This module defines the FastAPI application entry point for the Finance Science Service.
It provides HTTP endpoints to validate raw financial transaction data and orchestrate
the cleaning process via the DataProcessor.

Key Components:
    - Input/Output DTOs: Pydantic models for strict data validation.
    - Endpoints: REST interfaces for health checks and data processing.
"""
import logging
from typing import List, Optional, cast
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict
from processor import DataProcessor, RawTransactionInput

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Finance Science Service")

# Input


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
    date: str          # Es: "46020"
    operation: str
    details: str
    account: str
    amount: str        # Es: "-747.6"
    category: Optional[str] = None
    model_config = ConfigDict(extra='ignore')

# Output


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
        category (str): Assigned category label.
    """
    id: str
    date: str          # Es: "2025-12-29" (ISO Format)
    operation: str
    details: str
    account: str
    amount: float      # Es: -747.6
    category: str
    subCategory: str

@app.get("/health")
def health_check():
    """
    Performs a health check to verify the service status.

    Returns:
        dict: A dictionary containing the status and service name.
    """
    return {"status": "healthy", "service": "backend-science"}


@app.post("/process", response_model=List[ProcessedTransactionDto])
async def process_transactions(transactions: List[RawTransactionDto]):
    """
    Receives raw transactions, cleans them with Pandas, and returns typed data.

    This endpoint acts as a bridge between raw input and the data science logic
    encapsulated in the DataProcessor.

    Args:
        transactions (List[RawTransactionDto]): A list of raw transaction objects
            containing unformatted data (e.g., string dates, string amounts).

    Returns:
        List[ProcessedTransactionDto]: A list of processed transaction objects
            with standardized dates (ISO format) and numeric amounts.

    Raises:
        HTTPException: If an error occurs during the data cleaning or processing phase
            (returns status code 500).
    """
    try:
        logger.info("Received %s transactions to process", len(transactions))

        # Pydantic returns Dict[str, Any], but DataProcessor expects List[RawTransactionInput].
        # We use cast because we know the structure is compatible.
        raw_list = [t.model_dump() for t in transactions]

        cleaned_data = DataProcessor.clean_transactions(
            cast(List[RawTransactionInput], raw_list)
        )

        logger.info("Processing completed successfully")
        return cleaned_data

    except Exception as e:
        logger.error("Error while processing transactions: %s", e)
        raise HTTPException(status_code=500, detail=str(e)) from e
