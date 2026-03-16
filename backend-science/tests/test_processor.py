import pytest
import pandas as pd
from processor import DataProcessor

def test_clean_transactions_happy_path():
    raw_input = [
        {
            "id": "1",
            "date": "2025-01-01",
            "operation": "POS",
            "details": "PIZZA",
            "account": "Main",
            "amount": "-15.50",
            "category": "Ristoranti e bar",
            "originalLine": "100"
        }
    ]
    result = DataProcessor.clean_transactions(raw_input)
    
    assert len(result) == 1
    tx = result[0]
    assert tx["id"] == "100"
    assert tx["amount"] == -15.50
    assert tx["category"] == "FOOD"
    assert tx["subCategory"] == "Dining Out"

def test_clean_transactions_excel_dates():
    # Excel serial 46020 is 2025-12-29
    raw_input = [
        {
            "date": 46020,
            "amount": "100.0",
            "operation": "INC",
            "details": "SALARY",
            "account": "Bank",
            "category": "Stipendi e pensioni",
            "originalLine": 10
        }
    ]
    result = DataProcessor.clean_transactions(raw_input)
    assert result[0]["date"] == "2025-12-29"

def test_clean_transactions_missing_category():
    raw_input = [
        {
            "id": "1",
            "date": "2025-01-01",
            "operation": "X",
            "details": "Y",
            "account": "Z",
            "amount": "10"
        }
    ]
    result = DataProcessor.clean_transactions(raw_input)
    assert result[0]["category"] == "UNCATEGORIZED"
    assert result[0]["subCategory"] == "Unknown"

def test_clean_transactions_mapping_from_dataframe_types():
    # Ensure it handles floats and ints correctly for amount
    raw_input = [
        {"id": "1", "date": "2025-01-01", "amount": 100, "operation": "A", "details": "B", "account": "C"},
        {"id": "2", "date": "2025-01-01", "amount": -20.5, "operation": "A", "details": "B", "account": "C"}
    ]
    result = DataProcessor.clean_transactions(raw_input)
    assert result[0]["amount"] == 100.0
    assert result[1]["amount"] == -20.5
