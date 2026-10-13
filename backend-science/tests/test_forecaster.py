from decimal import Decimal
from typing import cast
import pandas as pd
from modules.forecaster import Forecaster, TransactionInput

def generate_mock_history(months=12, income=2500, fixed_expense=-1000, var_base=-500):
    data = []
    for i in range(months):
        date_str = f"2024-{i+1:02d}-01"
        # Fixed salary
        data.append({
            "id": f"s_{i}", "date": date_str, "amount": float(income), 
            "details": "SALARY", "category": "INCOME", "subCategory": "Salary",
            "operation": "TRANSFER", "account": "Main"
        })
        # Fixed Rent
        data.append({
            "id": f"r_{i}", "date": date_str, "amount": float(fixed_expense), 
            "details": "RENT", "category": "HOME", "subCategory": "Rent",
            "operation": "TRANSFER", "account": "Main"
        })
        # Variable Shopping (slightly increasing)
        data.append({
            "id": f"v_{i}", "date": date_str, "amount": float(var_base - (i * 10)), 
            "details": "AMAZON", "category": "SHOPPING", "subCategory": "Misc",
            "operation": "POS", "account": "Main"
        })
    return data

def test_predict_next_3_months_happy_path():
    history = generate_mock_history()
    result = Forecaster.predict_next_3_months(cast(list[TransactionInput], history))
    
    assert isinstance(result, list)
    assert len(result) == 3
    # Verify structure of first month
    m1 = result[0]
    assert "date" in m1
    assert m1["income"]["fixed"] == Decimal("2500.0")
    # Amazon is also detected as fixed because it recurs with low variance
    assert m1["expense"]["fixed"] <= Decimal("-1000.0")
    # Variable is small because most items (Rent + Amazon) are detected as fixed
    assert m1["expense"]["variable"] < Decimal("0")

def test_predict_goal_eta_completed():
    result = Forecaster.predict_goal_eta([], 1000, 1000)
    assert result["estimated_date"] == "COMPLETED"

def test_predict_goal_eta_insufficient_data():
    # Only 1 month of savings
    history = [{"id": "1", "date": "2025-01-01", "amount": 100, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"}]
    result = Forecaster.predict_goal_eta(cast(list[TransactionInput], history), 1000, 500)
    
    assert "estimated_date" in result
    assert isinstance(result["confidence"], str)
    assert "Incomplete history" in result["confidence"]

def test_predict_next_3_months_no_data():
    result = Forecaster.predict_next_3_months([])
    assert isinstance(result, dict)
    assert result["error"] == "No data available for forecast"

def test_predict_next_3_months_invalid_dates():
    history = [{"id": "1", "date": "invalid-date", "amount": 100, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"}]
    result = Forecaster.predict_next_3_months(cast(list[TransactionInput], history))
    assert isinstance(result, dict)
    assert "No valid dates" in result["error"]

def test_predict_goal_eta_extreme_slow_progress():
    # Only 1 month of extremely tiny savings
    history_short = [{"id": "1", "date": "2025-01-01", "amount": 0.0001, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"}]
    result_short = Forecaster.predict_goal_eta(cast(list[TransactionInput], history_short), 1000000, 0)
    assert result_short["estimated_date"] == "NEVER (Too slow or negative)"
    assert result_short["months_remaining"] == 9999.0

    # Multi-month extremely tiny savings (triggering linear regression path)
    history_long = [
        {"id": "1", "date": "2025-01-01", "amount": 0.0001, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"},
        {"id": "2", "date": "2025-02-01", "amount": 0.0002, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"},
        {"id": "3", "date": "2025-03-01", "amount": 0.0003, "details": "S", "category": "S", "subCategory": "S", "operation": "O", "account": "A"}
    ]
    result_long = Forecaster.predict_goal_eta(cast(list[TransactionInput], history_long), 1000000, 0)
    assert result_long["estimated_date"] == "NEVER (Too slow or negative)"
    assert result_long["months_remaining"] == Decimal("9999.0")
