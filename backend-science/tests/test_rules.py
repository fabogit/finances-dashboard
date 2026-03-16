from rules import get_category_details

def test_get_category_details_known_labels():
    # INCOME
    assert get_category_details("Stipendi e pensioni") == ("INCOME", "Salary & Pension")
    # HOME
    assert get_category_details("Pagamento affitti") == ("HOME", "Rent")
    # FOOD
    assert get_category_details("Generi alimentari e supermercato") == ("FOOD", "Groceries")
    # FINANCIAL
    assert get_category_details("Bonifici in uscita") == ("FINANCIAL", "Transfers Out")

def test_get_category_details_fallback():
    # Unknown label should return UNCATEGORIZED and the label itself
    assert get_category_details("Some Random Shop") == ("UNCATEGORIZED", "Some Random Shop")

def test_get_category_details_whitespace_handling():
    # Should strip whitespace
    assert get_category_details("  Stipendi e pensioni  ") == ("INCOME", "Salary & Pension")

def test_get_category_details_empty_or_none():
    assert get_category_details("") == ("UNCATEGORIZED", "Unknown")
    assert get_category_details(None) == ("UNCATEGORIZED", "Unknown")
