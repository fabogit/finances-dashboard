export const SEED_ASSET_NAMES = {
  MAIN_ACCOUNT: 'Main Account',
  ETF_PORTFOLIO: 'ETF Portfolio',
  ETF_WORLD_PORTFOLIO: 'ETF World Portfolio',
  CAR_LOAN: 'Car Loan',
} as const;

export const SEED_GOAL_NAMES = {
  EMERGENCY_FUND: 'Emergency Fund',
  LONG_TERM_SAVINGS: 'Long Term Savings',
} as const;

export const SEED_INSTITUTIONS = {
  INTESA_SANPAOLO: 'Intesa Sanpaolo',
  DIRECTA: 'Directa',
  FINDOMESTIC: 'Findomestic',
} as const;

export const SEED_CURRENCIES = {
  EUR: 'EUR',
} as const;

export const SEED_ACCOUNTS = {
  SEED_ACCOUNT: 'SEED_ACCOUNT',
} as const;

export const SEED_METADATA = {
  BATCH_ID: 'SEED_2025_v2_WEALTH',
} as const;

export const SEED_OPERATIONS = {
  TRANSFER: 'Transfer',
  DIRECT_DEBIT: 'Direct Debit',
  CARD: 'Card',
  BILL: 'Bill',
} as const;

export const SEED_DETAILS = {
  SALARY: 'Tech Solutions Salary',
  RENT: 'Monthly Rent',
  EMERGENCY_DEPOSIT: 'Emergency Fund Deposit',
  PAC_ETF: 'Pac ETF World',
  SUPERMARKET: 'Supermarket',
  RESTAURANT: 'Restaurant / UberEats',
  AMAZON: 'Amazon Purchase',
  ENERGY_BILL: 'Energy Bill',
} as const;

export const SEED_CATEGORIES = {
  INCOME: {
    NAME: 'INCOME',
    SALARY: 'Salary & Pension',
    TRANSFERS_IN: 'Transfers In',
    OTHER_INCOME: 'Other Income',
    REFUNDS: 'Refunds',
    INVESTMENTS_RETURNS: 'Investments Returns',
  },
  HOME: {
    NAME: 'HOME',
    RENT: 'Rent',
    UTILITIES: 'Utilities',
    INTERNET_PHONE: 'Internet & Phone',
    MOBILE_PHONE: 'Mobile Phone',
    HOME_MISC: 'Home Misc',
    FURNITURE_GARDEN: 'Furniture & Garden',
  },
  FOOD: {
    NAME: 'FOOD',
    GROCERIES: 'Groceries',
    DINING_OUT: 'Dining Out',
  },
  SHOPPING: {
    NAME: 'SHOPPING',
    CLOTHING: 'Clothing',
    ELECTRONICS: 'Electronics',
    MEDIA: 'Media',
  },
  TRANSPORT: {
    NAME: 'TRANSPORT',
    FUEL: 'Fuel',
    PUBLIC_TRANSPORT: 'Public Transport & Taxi',
    TRAVEL_TICKETS: 'Travel Tickets',
    TRANSPORT_MISC: 'Transport Misc',
  },
  HEALTH: {
    NAME: 'HEALTH',
    MEDICAL_VISITS: 'Medical Visits',
    PHARMACY: 'Pharmacy',
    PERSONAL_CARE: 'Personal Care',
    HEALTH_MISC: 'Health Misc',
  },
  LEISURE: {
    NAME: 'LEISURE',
    TRAVEL_HOLIDAYS: 'Travel & Holidays',
    ENTERTAINMENT: 'Entertainment',
    EVENTS_MUSEUMS: 'Events & Museums',
    SPORTS_COURSES: 'Sports & Courses',
    LEISURE_MISC: 'Leisure Misc',
    MEMBERSHIPS: 'Memberships',
  },
  FINANCIAL: {
    NAME: 'FINANCIAL',
    TRANSFERS_OUT: 'Transfers Out',
    CASH_WITHDRAWAL: 'Cash Withdrawal',
    TAXES_FEES: 'Taxes & Fees',
    BANK_CHARGES: 'Bank Charges',
    INVESTMENTS: 'Investments',
    DONATIONS: 'Donations',
  },
  OTHER: {
    NAME: 'OTHER',
    MISC_EXPENSES: 'Misc Expenses',
  },
} as const;
