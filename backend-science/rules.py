"""
Rules for categorizing and translating transactions.
Mapping: Original Italian Label -> (Macro Category English, Sub Category English)
"""

# "Etichetta Italiana" -> ("MACRO", "Sub Category Translated")
CATEGORY_MAP = {
    # --- INCOME ---
    "Stipendi e pensioni": ("INCOME", "Salary & Pension"),
    "Bonifici ricevuti": ("INCOME", "Transfers In"),
    "Entrate varie": ("INCOME", "Other Income"),
    "Rimborsi spese e storni": ("INCOME", "Refunds"),
    "Disinvestimenti, BDR e Salvadanaio": ("INCOME", "Investments Returns"),

    # --- HOME & UTILITIES ---
    "Pagamento affitti": ("HOME", "Rent"),
    "Gas & energia elettrica": ("HOME", "Utilities"),
    "Domiciliazioni e Utenze": ("HOME", "Utilities"),
    "TV, Internet, telefono": ("HOME", "Internet & Phone"),
    "Cellulare": ("HOME", "Mobile Phone"),
    "Casa varie": ("HOME", "Home Misc"),
    "Elettrodomestici, arredamento e giardino": ("HOME", "Furniture & Garden"),

    # --- FOOD & DINING ---
    "Generi alimentari e supermercato": ("FOOD", "Groceries"),
    "Ristoranti e bar": ("FOOD", "Dining Out"),

    # --- SHOPPING ---
    "Abbigliamento e accessori": ("SHOPPING", "Clothing"),
    "Hi-tech e informatica": ("SHOPPING", "Electronics"),
    "Libri, film e musica": ("SHOPPING", "Media"),

    # --- TRANSPORT ---
    "Benzina": ("TRANSPORT", "Fuel"),
    "Trasporti, noleggi, taxi e parcheggi": ("TRANSPORT", "Public Transport & Taxi"),
    "Treno, aereo, nave": ("TRANSPORT", "Travel Tickets"),
    "Trasporti varie": ("TRANSPORT", "Transport Misc"),

    # --- HEALTH ---
    "Cliniche": ("HEALTH", "Medical Visits"),
    "Farmacia": ("HEALTH", "Pharmacy"),
    "Cura della persona": ("HEALTH", "Personal Care"),
    "Salute e benessere varie": ("HEALTH", "Health Misc"),

    # --- LEISURE & LIFESTYLE ---
    "Viaggi e vacanze": ("LEISURE", "Travel & Holidays"),
    "Divertimenti e locali": ("LEISURE", "Entertainment"),
    "Spettacoli e musei": ("LEISURE", "Events & Museums"),
    "Corsi e sport": ("LEISURE", "Sports & Courses"),
    "Tempo libero varie": ("LEISURE", "Leisure Misc"),
    "Associazioni": ("LEISURE", "Memberships"),

    # --- FINANCIAL ---
    "Bonifici in uscita": ("FINANCIAL", "Transfers Out"),
    "Prelievi": ("FINANCIAL", "Cash Withdrawal"),
    "Imposte, bolli e commissioni": ("FINANCIAL", "Taxes & Fees"),
    "Addebiti vari": ("FINANCIAL", "Bank Charges"),
    "Investimenti, BDR e Salvadanaio": ("FINANCIAL", "Investments"),
    "Donazioni": ("FINANCIAL", "Donations"),

    # --- OTHER / UNCATEGORIZED ---
    "Altre uscite": ("OTHER", "Misc Expenses"),
}


def get_category_details(original_label: str):
    """
    Returns (Macro, Sub) tuple given an Italian label.
    Case insensitive and trims whitespace.
    """
    if not original_label:
        return ("UNCATEGORIZED", "Unknown")

    clean_label = original_label.strip()

    if clean_label in CATEGORY_MAP:
        return CATEGORY_MAP[clean_label]

    return ("UNCATEGORIZED", clean_label)
