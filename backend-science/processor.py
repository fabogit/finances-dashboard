"""
Transaction Processing Module.

This module encapsulates the logic for cleaning, transforming, and validating
raw financial transaction data. It leverages Pandas to handle common data
inconsistencies found in exports (e.g., Excel serial dates, mixed string/numeric
types) and strictly types the output for downstream services.
"""
from typing import List, Dict, Any, TypedDict, cast
import pandas as pd


class CleanedTransaction(TypedDict):
    """
    Defines the strict schema for a processed transaction dictionary.
    """
    id: str
    date: str
    operation: str
    details: str
    account: str
    amount: float
    category: str


class DataProcessor:
    """
    Encapsulates logic for cleaning and transforming raw financial data.
    """

    @staticmethod
    def clean_transactions(raw_data: List[Dict[str, Any]]) -> List[CleanedTransaction]:
        """
        Converts raw data (Excel Strings/Serials) to native Python formats (ISO Date, Float).

        This method performs data cleaning using Pandas to handle:
        1. Date Conversion: parses Excel serial dates (e.g., "46020") relative to
           the origin 1899-12-30 into ISO 8601 strings (YYYY-MM-DD).
        2. Numeric Parsing: converts amounts to floats, coercing errors to NaN and
           filling missing values with 0.0.
        3. Category Normalization: ensures the 'category' field exists and defaults
           missing values to "Uncategorized".

        Args:
            raw_data (List[Dict[str, Any]]): A list of dictionaries containing raw
                transaction data.

        Returns:
            List[CleanedTransaction]: A list of strictly typed dictionaries with
                standardized values, suitable for serialization.
        """
        df = pd.DataFrame(raw_data)

        # 1. Date Processing
        df['date_numeric'] = pd.to_numeric(df['date'], errors='coerce')
        df['clean_date'] = pd.to_datetime(
            df['date_numeric'], unit='D', origin='1899-12-30'
        )
        df['date'] = df['clean_date'].apply(
            lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else ''
        )

        # 2. Amount Processing
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)

        # 3. Category Processing
        if 'category' not in df.columns:
            df['category'] = None
        df['category'] = df['category'].fillna("Uncategorized")

        # Select and order columns matching CleanedTransaction
        final_df = df[['id', 'date', 'operation',
                       'details', 'account', 'amount', 'category']]

        # Convert to list of dicts
        result = final_df.to_dict(orient='records')

        # Cast to strict TypedDict for type checkers
        return cast(List[CleanedTransaction], result)
