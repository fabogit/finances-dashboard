"""
Transaction Processing Module.

This module encapsulates the logic for cleaning, transforming, and validating
raw financial transaction data. It leverages Pandas to handle common data
inconsistencies found in exports (e.g., Excel serial dates, mixed string/numeric
types) and strictly types the output for downstream services.
"""
from typing import List, TypedDict, cast, Union, Optional
import pandas as pd


class RawTransactionInput(TypedDict, total=False):
    """
    Schema for the raw input data received from the Node.js/Prisma service.

    Using total=False allows for optional keys like 'originalLine' or 'category'.
    Types are permissive (Union) because data hasn't been cleaned yet.
    """
    id: str
    date: Union[str, float, int]    # "46020" (str) or 46020 (int/float)
    operation: str
    details: str
    account: str
    amount: Union[str, float, int]  # "-747.6" (str) or -747.6 (float)
    category: Optional[str]
    originalLine: Union[str, int]  # Optional


class CleanedTransaction(TypedDict):
    """
    Defines the strict schema for a processed transaction dictionary.
    Matches the 'ProcessedTransaction' interface in Node.js.
    """
    id: str
    date: str          # ISO 8601 YYYY-MM-DD
    operation: str
    details: str
    account: str
    amount: float      # Strictly float for calculations
    category: str


class DataProcessor:
    """
    Encapsulates logic for cleaning and transforming raw financial data.
    """

    @staticmethod
    def clean_transactions(raw_data: List[RawTransactionInput]) -> List[CleanedTransaction]:
        """
        Converts raw data (Excel Strings/Serials) to native Python formats (ISO Date, Float).

        This method performs data cleaning using Pandas to handle:
        1. Date Conversion: parses Excel serial dates (e.g., "46020") relative to
           the origin 1899-12-30 into ISO 8601 strings (YYYY-MM-DD).
        2. Numeric Parsing: converts amounts to floats, coercing errors to NaN and
           filling missing values with 0.0.
        3. Category Normalization: ensures the 'category' field exists and defaults
           missing values to "Uncategorized".
        4. ID Generation: derives the unique identifier from 'originalLine' if available,
           otherwise defaults to the row index.

        Args:
            raw_data (List[RawTransactionInput]): A list of dictionaries containing raw
                transaction data.

        Returns:
            List[CleanedTransaction]: A list of strictly typed dictionaries with
                standardized values, suitable for serialization.
        """
        df = pd.DataFrame(raw_data)

        # 1. Date Processing
        # coerce to handle input str/num
        df['date_numeric'] = pd.to_numeric(df['date'], errors='coerce')
        df['clean_date'] = pd.to_datetime(
            df['date_numeric'], unit='D', origin='1899-12-30'
        )
        df['date'] = df['clean_date'].dt.strftime('%Y-%m-%d').fillna('')

        # 2. Amount Processing
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)

        # 3. Category Processing
        if 'category' not in df.columns:
            df['category'] = None
        df['category'] = df['category'].fillna("Uncategorized")

        # 4. ID Generation
        if 'originalLine' in df.columns:
            df['id'] = df['originalLine'].astype(str)
        else:
            df['id'] = df.index.astype(str)

        # Select and order columns matching CleanedTransaction
        final_df = df[['id', 'date', 'operation',
                       'details', 'account', 'amount', 'category']]

        # Convert to list of dicts
        result = final_df.to_dict(orient='records')

        # Cast to strict TypedDict for type checkers (MyPy, Pyright)
        return cast(List[CleanedTransaction], result)
