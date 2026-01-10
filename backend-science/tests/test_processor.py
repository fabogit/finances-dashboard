
import unittest
import pandas as pd
import numpy as np
from processor import DataProcessor, RawTransactionInput

class TestDataProcessor(unittest.TestCase):
    def test_clean_transactions_date_performance_logic(self):
        """
        Verify that the date cleaning logic produces correct results.
        This test mimics the vectorized optimization we are about to implement.
        """
        # Create a mix of valid dates, NaTs (represented as invalid strings or empty), and valid strings
        # Origin 1899-12-30. 46020 -> 2025-12-29

        raw_data = [
            {"date": "46020", "amount": "10.0", "operation": "op", "details": "det", "account": "acc"},
            {"date": "", "amount": "20.0", "operation": "op", "details": "det", "account": "acc"},
            {"date": "invalid", "amount": "30.0", "operation": "op", "details": "det", "account": "acc"},
        ]

        processed = DataProcessor.clean_transactions(raw_data)

        self.assertEqual(len(processed), 3)

        # Check first item: valid date
        self.assertEqual(processed[0]['date'], '2025-12-29')

        # Check second item: empty date -> should be empty string
        self.assertEqual(processed[1]['date'], '')

        # Check third item: invalid date -> should be empty string
        self.assertEqual(processed[2]['date'], '')

if __name__ == '__main__':
    unittest.main()
