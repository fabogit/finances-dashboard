"""
Module providing financial forecasting capabilities.

This module utilizes historical transaction data to predict future financial flows
(income and expenses) using statistical analysis for recurring items and
Linear Regression for variable trends.
"""
from typing import TypedDict, Union
import re
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

# --- Internal DTOs ---


class ForecastFlowResult(TypedDict):
    """Represents the breakdown of a financial flow (Income or Expense)."""
    total: float
    fixed: float
    variable: float


class MonthlyForecast(TypedDict):
    """Represents the financial forecast for a specific single month."""
    date: str
    income: ForecastFlowResult
    expense: ForecastFlowResult
    balance: float


class TransactionInput(TypedDict):
    """Input structure for a single transaction to be analyzed."""
    id: str
    date: str
    amount: float
    details: str
    category: str
    subCategory: str | None
    operation: str
    account: str


class Forecaster:
    """
    Service class responsible for analyzing transaction history
    and predicting future financial flows using Linear Regression.
    """

    @staticmethod
    def predict_next_3_months(
        transactions: list[TransactionInput],
        std_deviation_threshold: float = 0.2
    ) -> list[MonthlyForecast] | dict[str, str]:
        """
        Analyzes past transactions to forecast the balance for the next 3 months.

        The forecasting process involves:
        1. Filtering the last 12 months of data.
        2. Splitting transactions into income and expense flows.
        3. Identifying recurring (fixed) flows using statistical variance.
        4. Predicting the variable component using Linear Regression trends.
        5. Combining results into a monthly forecast.

        Args:
            transactions (list[TransactionInput]): A list of past transactions with necessary fields.
            std_deviation_threshold (float, optional): Threshold ratio (std/mean) to consider an expense 'Fixed'.
                Default is 0.2 (20%). Higher values make detection looser.

        Returns:
            Union[list[MonthlyForecast], dict[str, str]]: A list of 3 monthly forecast objects,
            or a dictionary with an "error" key if the input data is insufficient or invalid.
        """
        if not transactions:
            return {"error": "No data available for forecast"}

        # Convert list of dicts to DataFrame
        df = pd.DataFrame(transactions)

        # 1. Type Conversion
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)

        # Drop invalid rows
        df = df.dropna(subset=['date'])

        if df.empty:
            return {"error": "No valid dates in data"}

        # 2. Date Filtering (Last 12 Months Strategy)
        last_date = df['date'].max()
        start_date = last_date - pd.Timedelta(days=365)
        df = df[df['date'] >= start_date].copy()

        if df.empty:
            return {"error": "Not enough data in the selected period"}

        # 3. Split Income vs Expense
        income_df = df[df['amount'] > 0].copy()
        expense_df = df[df['amount'] < 0].copy()

        # 4. Analyze flows (Get 3 future points for each)
        inc_preds, fixed_inc = Forecaster._analyze_flow(
            income_df,
            months_to_predict=3,
            std_threshold_pct=std_deviation_threshold
        )
        exp_preds, fixed_exp = Forecaster._analyze_flow(
            expense_df,
            months_to_predict=3,
            std_threshold_pct=std_deviation_threshold
        )

        # 5. Build Result List
        results: list[MonthlyForecast] = []

        for i in range(3):
            future_date = last_date + pd.DateOffset(months=i + 1)
            date_str = future_date.strftime('%Y-%m')

            curr_inc_total = inc_preds[i]
            curr_exp_total = exp_preds[i]

            var_inc = curr_inc_total - fixed_inc
            var_exp = curr_exp_total - fixed_exp

            results.append({
                "date": date_str,
                "income": {
                    "total": float(np.round(curr_inc_total, 2)),
                    "fixed": float(np.round(fixed_inc, 2)),
                    "variable": float(np.round(var_inc, 2))
                },
                "expense": {
                    "total": float(np.round(curr_exp_total, 2)),
                    "fixed": float(np.round(fixed_exp, 2)),
                    "variable": float(np.round(var_exp, 2))
                },
                "balance": float(np.round(curr_inc_total + curr_exp_total, 2))
            })

        return results

    @staticmethod
    def _analyze_flow(
        df: pd.DataFrame,
        months_to_predict: int = 3,
        std_threshold_pct: float = 0.2
    ) -> tuple[list[float], float]:
        """
        Helper method to calculate Fixed vs Variable trend and project future totals.

        This method performs two main steps:
        A. Recurrence Detection: Groups transactions by subCategory or cleaned details
           to identify fixed (recurring) items. An item is considered fixed if it appears
           at least 3 times and its amount's standard deviation is within the threshold.
        B. Trend Analysis: Uses Linear Regression on monthly totals to project future
           values for the variable portion of the flow.

        Args:
            df (pd.DataFrame): DataFrame containing the transactions for a specific flow (Income/Expense).
            months_to_predict (int): Number of future months to project. Defaults to 3.
            std_threshold_pct (float): Sensitivity threshold for recurring item detection.

        Returns:
            tuple[list[float], float]: A tuple containing:
                - A list of projected total amounts for each future month.
                - The total monthly value of identified 'Fixed' items.
        """
        if df.empty:
            return [0.0] * months_to_predict, 0.0

        # --- A. DETECT FIXED EXPENSES (Recurring) ---
        def clean_details(text):
            if not isinstance(text, str):
                return "Unknown"
            return re.sub(r'\d+', '', text).strip().upper()

        df['group_key'] = df['subCategory'].fillna(
            df['details'].apply(clean_details)
        )

        recurrence = df.groupby('group_key').agg(
            count=('amount', 'count'),
            mean_amount=('amount', 'mean'),
            std_amount=('amount', 'std')
        )

        # Rule: At least 3 occurrences AND Standard Deviation < threshold % of mean
        std_threshold = recurrence['mean_amount'].abs() * std_threshold_pct

        fixed_mask = (recurrence['count'] >= 3) & (
            recurrence['std_amount'].fillna(0) < std_threshold)

        fixed_items = recurrence[fixed_mask]
        fixed_total = float(fixed_items['mean_amount'].sum())

        # --- B. ANALYZE VARIABLE TREND (Linear Regression) ---

        # Convert date to a linear monthly index (integer)
        # 2024-01 -> X, 2024-02 -> X+1
        df['month_idx'] = df['date'].values.astype('datetime64[M]').astype(int)

        # Group by this numeric index
        monthly_totals = df.groupby('month_idx')['amount'].sum().reset_index()

        predictions: list[float] = []

        if len(monthly_totals) < 2:
            # Not enough data for regression: Use simple mean for all future months
            avg_val = float(monthly_totals['amount'].mean())
            predictions = [avg_val] * months_to_predict
        else:
            # Linear Regression Preparation
            x = np.array(monthly_totals['month_idx'].values).reshape(-1, 1)
            y = np.array(monthly_totals['amount'].values)

            model = LinearRegression()
            model.fit(x, y)

            # Predict Next N Months
            last_idx = monthly_totals['month_idx'].max()

            # Create input array for prediction: [[idx+1], [idx+2], [idx+3]]
            future_indices = np.array(
                [[last_idx + i] for i in range(1, months_to_predict + 1)]
            )

            raw_predictions = model.predict(future_indices)
            predictions = [float(val) for val in raw_predictions]

        return predictions, fixed_total

    @staticmethod
    def predict_goal_eta(
        transactions: list[TransactionInput],
        target_amount: float,
        current_amount: float
    ) -> dict[str, Union[str, float, None]]:
        """
        Predicts when a savings goal will be completed based on savings history.

        The prediction Uses Linear Regression to project the future savings trend.
        If history is too short (less than 2 months), it falls back to a simple average.

        Args:
            transactions (list[TransactionInput]): Historical transaction data.
            target_amount (float): The final amount the user wants to reach.
            current_amount (float): The current progress towards the goal.

        Returns:
            dict[str, Union[str, float, None]]: A dictionary containing:
                - estimated_date (str): Expected completion month in "YYYY-MM" or "COMPLETED".
                - monthly_avg (float): The projected monthly savings velocity.
                - months_remaining (float): Number of months until the goal is reached.
                - confidence (str): Qualitative assessment of the prediction (HIGH/MEDIUM/LOW).
                - error (str, optional): Error message if projection is impossible.
        """
        if not transactions:
            return {"error": "No data for projection"}

        df = pd.DataFrame(transactions)
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce').fillna(0.0)
        df = df.dropna(subset=['date'])

        # Group by month and sum the amounts (savings are positive in current context)
        df['month_idx'] = df['date'].values.astype('datetime64[M]').astype(int)
        monthly_savings = df.groupby('month_idx')['amount'].sum().reset_index()

        # We need at least 2 months to find a trend
        if len(monthly_savings) < 2:
            avg_savings = float(monthly_savings['amount'].mean())
            if avg_savings <= 0:
                return {"error": "Average savings is zero or negative"}
            months_remaining = (target_amount - current_amount) / avg_savings
            eta_date = pd.Timestamp.now() + pd.DateOffset(months=int(months_remaining))
            return {
                "estimated_date": eta_date.strftime('%Y-%m'),
                "monthly_avg": float(np.round(avg_savings, 2)),
                "months_remaining": float(np.round(months_remaining, 1)),
                "confidence": "LOW (Incomplete history)"
            }

        # Linear Regression for trend
        x = np.array(monthly_savings['month_idx'].values).reshape(-1, 1)
        y = np.array(monthly_savings['amount'].values)

        model = LinearRegression()
        model.fit(x, y)

        # Current monthly velocity (slope)
        last_idx = monthly_savings['month_idx'].max()
        # predict the next few months to get an average velocity including trend
        future_indices = np.array([[last_idx + i] for i in range(1, 4)])
        future_savings = model.predict(future_indices)
        avg_future_velocity = float(np.mean(future_savings))

        if avg_future_velocity <= 0:
            return {"error": "Projected savings trend is zero or negative"}

        remaining_to_save = target_amount - current_amount
        if remaining_to_save <= 0:
            return {"estimated_date": "COMPLETED", "months_remaining": 0}

        months_remaining = remaining_to_save / avg_future_velocity
        eta_date = pd.Timestamp.now() + pd.DateOffset(months=int(months_remaining))

        return {
            "estimated_date": eta_date.strftime('%Y-%m'),
            "monthly_avg": float(np.round(avg_future_velocity, 2)),
            "months_remaining": float(np.round(months_remaining, 1)),
            "confidence": "HIGH (Linear trend)" if len(monthly_savings) >= 4 else "MEDIUM"
        }
