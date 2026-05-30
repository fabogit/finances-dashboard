"""
Transaction Processing Module.

This module encapsulates the logic for cleaning, transforming, and validating
raw financial transaction data. It leverages Pandas to handle common data
inconsistencies found in exports and applies categorization rules.
"""
from typing import TypedDict, cast, Optional
from decimal import Decimal
import pandas as pd
from .rules import get_category_details


class RawTransactionInput(TypedDict, total=False):
    """
    Schema for the raw input data received from the Node.js/Prisma service.
    """
    id: str
    date: str | float | int
    operation: str
    details: str
    account: str
    amount: str | float | int
    category: Optional[str]
    originalLine: str | int


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
    amount: Decimal    # Strictly Decimal for precision
    category: str      # MACRO Category (e.g. "HOME")
    subCategory: str


class DataProcessor:
    """
    Orchestration service for cleaning, transforming, and enriching financial transaction data.
    Uses Pandas for high-performance batch processing of raw data exports.
    """

    @staticmethod
    def clean_transactions(raw_data: list[RawTransactionInput]) -> list[CleanedTransaction]:
        """
        Converts raw data (Excel Strings/Serials) to native Python formats and applies
        categorization rules to derive Macro and Sub-categories.

        This method performs data cleaning and enrichment using Pandas to handle:
        1. Date Conversion: Parses Excel serial dates (e.g., "46020") relative to
           the origin 1899-12-30 into ISO 8601 strings (YYYY-MM-DD).
        2. Numeric Parsing: Converts amounts to floats, coercing errors to NaN and
           filling missing values with 0.0.
        3. Category Enrichment: Maps the raw category string via 'get_category_details'
           to generate a standardized 'category' (Macro) and 'subCategory' (English).
        4. ID Generation: Derives the unique identifier from 'originalLine' if available,
           otherwise defaults to the row index.

        Args:
            raw_data (list[RawTransactionInput]): A list of dictionaries containing raw
                transaction data.

        Returns:
            list[CleanedTransaction]: A list of strictly typed dictionaries with
                standardized values (including Macro and Sub categories), suitable for serialization.
        """
        df = pd.DataFrame(raw_data)

        # 1. Date Processing
        def parse_resilient_date(val):
            if pd.isnull(val):
                return pd.NaT
            try:
                numeric_val = float(val)
                if numeric_val > 10000:
                    return pd.to_datetime(numeric_val, unit='D', origin='1899-12-30')
            except (ValueError, TypeError):
                pass
            try:
                return pd.to_datetime(val)
            except (ValueError, TypeError):
                return pd.NaT

        df['clean_date'] = df['date'].apply(parse_resilient_date)
        df['date'] = df['clean_date'].apply(
            lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else ''
        )

        # 2. Amount Processing
        df['amount'] = cast(pd.Series, pd.to_numeric(df['amount'], errors='coerce')).fillna(0.0)

        # --- 3. Category Processing ---
        if 'category' not in df.columns:
            df['category'] = ""
        df['raw_category'] = df['category'].fillna("").astype(str)

        mapped_cats = df['raw_category'].apply(get_category_details)

        # zip(*mapped_cats) transforms [(A,B), (C,D)] in: (A,C) & (B,D)
        if not mapped_cats.empty:
            df['macro_cat'], df['sub_cat_en'] = zip(*mapped_cats)
        else:
            df['macro_cat'] = "UNCATEGORIZED"
            df['sub_cat_en'] = "Unknown"

        # 4. ID Generation
        if 'originalLine' in df.columns:
            df['id'] = df['originalLine'].astype(str)
        else:
            df['id'] = df.index.astype(str)

        # Select and order columns matching CleanedTransaction
        final_df = pd.DataFrame()
        final_df['id'] = df['id']
        final_df['date'] = df['date']
        final_df['operation'] = df['operation']
        final_df['details'] = df['details']
        final_df['account'] = df['account']
        final_df['amount'] = df['amount']
        final_df['category'] = df['macro_cat']
        final_df['subCategory'] = df['sub_cat_en']

        # Convert to list of dicts and fix amount type
        result = final_df.to_dict(orient='records')
        for item in result:
            # Ensure amount is Decimal for precision preservation
            item['amount'] = Decimal(str(item['amount']))

        return cast(list[CleanedTransaction], result)
