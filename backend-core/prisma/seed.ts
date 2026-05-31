import {
  PrismaClient,
  ExpenseType,
  BudgetRuleType,
  Prisma,
  AssetType,
  GoalStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
import { createHash } from 'crypto';
import { SYSTEM_CATEGORIES } from '../src/common/constants/domain.constants';
import {
  SEED_ASSET_NAMES,
  SEED_GOAL_NAMES,
  SEED_INSTITUTIONS,
  SEED_CURRENCIES,
  SEED_ACCOUNTS,
  SEED_METADATA,
  SEED_OPERATIONS,
  SEED_DETAILS,
  SEED_CATEGORIES,
} from './seed.constants';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- DATA STRUCTURES ---

const SEED_DATA = [
  {
    name: SEED_CATEGORIES.INCOME.NAME,
    type: ExpenseType.UNCLASSIFIED,
    icon: '💰',
    subs: [
      { name: SEED_CATEGORIES.INCOME.SALARY, type: ExpenseType.UNCLASSIFIED },
      {
        name: SEED_CATEGORIES.INCOME.TRANSFERS_IN,
        type: ExpenseType.UNCLASSIFIED,
      },
      {
        name: SEED_CATEGORIES.INCOME.OTHER_INCOME,
        type: ExpenseType.UNCLASSIFIED,
      },
      { name: SEED_CATEGORIES.INCOME.REFUNDS, type: ExpenseType.UNCLASSIFIED },
      {
        name: SEED_CATEGORIES.INCOME.INVESTMENTS_RETURNS,
        type: ExpenseType.SAVINGS,
      },
    ],
  },
  {
    name: SEED_CATEGORIES.HOME.NAME,
    type: ExpenseType.NEEDS,
    icon: '🏠',
    subs: [
      { name: SEED_CATEGORIES.HOME.RENT, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HOME.UTILITIES, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HOME.INTERNET_PHONE, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HOME.MOBILE_PHONE, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HOME.HOME_MISC, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HOME.FURNITURE_GARDEN, type: ExpenseType.WANTS },
    ],
  },
  {
    name: SEED_CATEGORIES.FOOD.NAME,
    type: ExpenseType.NEEDS,
    icon: '🍔',
    subs: [
      { name: SEED_CATEGORIES.FOOD.GROCERIES, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.FOOD.DINING_OUT, type: ExpenseType.WANTS },
    ],
  },
  {
    name: SEED_CATEGORIES.SHOPPING.NAME,
    type: ExpenseType.WANTS,
    icon: '🛍️',
    subs: [
      { name: SEED_CATEGORIES.SHOPPING.CLOTHING, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.SHOPPING.ELECTRONICS, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.SHOPPING.MEDIA, type: ExpenseType.WANTS },
    ],
  },
  {
    name: SEED_CATEGORIES.TRANSPORT.NAME,
    type: ExpenseType.NEEDS,
    icon: '🚗',
    subs: [
      { name: SEED_CATEGORIES.TRANSPORT.FUEL, type: ExpenseType.NEEDS },
      {
        name: SEED_CATEGORIES.TRANSPORT.PUBLIC_TRANSPORT,
        type: ExpenseType.NEEDS,
      },
      {
        name: SEED_CATEGORIES.TRANSPORT.TRAVEL_TICKETS,
        type: ExpenseType.WANTS,
      },
      {
        name: SEED_CATEGORIES.TRANSPORT.TRANSPORT_MISC,
        type: ExpenseType.NEEDS,
      },
    ],
  },
  {
    name: SEED_CATEGORIES.HEALTH.NAME,
    type: ExpenseType.NEEDS,
    icon: '💊',
    subs: [
      { name: SEED_CATEGORIES.HEALTH.MEDICAL_VISITS, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HEALTH.PHARMACY, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HEALTH.PERSONAL_CARE, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.HEALTH.HEALTH_MISC, type: ExpenseType.NEEDS },
    ],
  },
  {
    name: SEED_CATEGORIES.LEISURE.NAME,
    type: ExpenseType.WANTS,
    icon: '🎉',
    subs: [
      {
        name: SEED_CATEGORIES.LEISURE.TRAVEL_HOLIDAYS,
        type: ExpenseType.WANTS,
      },
      { name: SEED_CATEGORIES.LEISURE.ENTERTAINMENT, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.LEISURE.EVENTS_MUSEUMS, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.LEISURE.SPORTS_COURSES, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.LEISURE.LEISURE_MISC, type: ExpenseType.WANTS },
      { name: SEED_CATEGORIES.LEISURE.MEMBERSHIPS, type: ExpenseType.WANTS },
    ],
  },
  {
    name: SEED_CATEGORIES.FINANCIAL.NAME,
    type: ExpenseType.NEEDS,
    icon: '🏦',
    subs: [
      {
        name: SEED_CATEGORIES.FINANCIAL.TRANSFERS_OUT,
        type: ExpenseType.UNCLASSIFIED,
      },
      {
        name: SEED_CATEGORIES.FINANCIAL.CASH_WITHDRAWAL,
        type: ExpenseType.UNCLASSIFIED,
      },
      { name: SEED_CATEGORIES.FINANCIAL.TAXES_FEES, type: ExpenseType.NEEDS },
      { name: SEED_CATEGORIES.FINANCIAL.BANK_CHARGES, type: ExpenseType.NEEDS },
      {
        name: SEED_CATEGORIES.FINANCIAL.INVESTMENTS,
        type: ExpenseType.SAVINGS,
      },
      { name: SEED_CATEGORIES.FINANCIAL.DONATIONS, type: ExpenseType.WANTS },
    ],
  },
  {
    name: SEED_CATEGORIES.OTHER.NAME,
    type: ExpenseType.UNCLASSIFIED,
    icon: SYSTEM_CATEGORIES.DEFAULT_ICON,
    subs: [
      {
        name: SEED_CATEGORIES.OTHER.MISC_EXPENSES,
        type: ExpenseType.UNCLASSIFIED,
      },
    ],
  },
];

const categoryMap: Record<string, Record<string, string>> = {};
const assetMap: Record<string, string> = {};
const SEED_BATCH_ID = SEED_METADATA.BATCH_ID;

// --- HELPER FUNCTIONS ---

const getRandomDateInMonth = (year: number, month: number) => {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
  date.setHours(12, 0, 0, 0);
  return date;
};

const getRandomAmount = (min: number, max: number) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

const generateTransactionHash = (tx: {
  date: Date;
  amount: number | string | Prisma.Decimal;
  details?: string | null;
  account?: string | null;
  operation?: string | null;
}): string => {
  const details = tx.details || '';
  const account = tx.account || '';
  const operation = tx.operation || '';
  const dateStr = tx.date.toISOString().split('T')[0];
  const amountStr = String(tx.amount);

  const input = `${dateStr}|${amountStr}|${details}|${account}|${operation}`;
  return createHash('sha256').update(input).digest('hex');
};

// --- SEEDING FUNCTIONS ---
// These functions handle the creation of initial system data.

async function seedAssets() {
  console.log('🌱 Seeding Assets & History...');

  // 1. Cash: Main Bank Account
  const mainAccount = await prisma.asset.create({
    data: {
      name: SEED_ASSET_NAMES.MAIN_ACCOUNT,
      type: AssetType.CASH,
      institution: SEED_INSTITUTIONS.INTESA_SANPAOLO,
      balance: 5400.0,
      currency: SEED_CURRENCIES.EUR,
    },
  });
  assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT] = mainAccount.id;

  // 2. Investment: ETF Portfolio (Accumulating)
  const etfPortfolio = await prisma.asset.create({
    data: {
      name: SEED_ASSET_NAMES.ETF_WORLD_PORTFOLIO,
      type: AssetType.INVESTMENT,
      institution: SEED_INSTITUTIONS.DIRECTA,
      balance: 15200.0,
      currency: SEED_CURRENCIES.EUR,
    },
  });
  assetMap[SEED_ASSET_NAMES.ETF_PORTFOLIO] = etfPortfolio.id;

  // Seed History for ETF (Simulate growth over 2024/2025)
  let historyValue = 12000;
  for (let m = 0; m < 12; m++) {
    historyValue += getRandomAmount(100, 300);
    await prisma.assetHistory.create({
      data: {
        assetId: etfPortfolio.id,
        date: new Date(2024, m, 28),
        balance: new Prisma.Decimal(historyValue),
      },
    });
  }

  // History 2025
  await prisma.assetHistory.create({
    data: {
      assetId: etfPortfolio.id,
      date: new Date(2025, 0, 31),
      balance: new Prisma.Decimal(15200),
    },
  });

  // 3. Liability: Car Loan
  const carLoan = await prisma.asset.create({
    data: {
      name: SEED_ASSET_NAMES.CAR_LOAN,
      type: AssetType.DEBT,
      institution: SEED_INSTITUTIONS.FINDOMESTIC,
      balance: 8500.0,
      currency: SEED_CURRENCIES.EUR,
    },
  });
  assetMap[SEED_ASSET_NAMES.CAR_LOAN] = carLoan.id;

  console.log('✅ Assets created.');
}

async function seedGoals() {
  console.log('🌱 Seeding Savings Goals...');

  // 1. Emergency Fund
  await prisma.savingsGoal.create({
    data: {
      name: SEED_GOAL_NAMES.EMERGENCY_FUND,
      targetAmount: 10000,
      currentAmount: 2500,
      status: GoalStatus.ACTIVE,
      icon: '🛡️',
      color: '#32a852',
      assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
    },
  });

  // 2. Long Term Savings
  await prisma.savingsGoal.create({
    data: {
      name: SEED_GOAL_NAMES.LONG_TERM_SAVINGS,
      targetAmount: 50000,
      currentAmount: 15200, // Linked to ETF balance basically
      status: GoalStatus.ACTIVE,
      icon: '📈',
      color: '#2b6cb0',
      assetId: assetMap[SEED_ASSET_NAMES.ETF_PORTFOLIO],
    },
  });

  console.log('✅ Goals created.');
}

async function seedCategories() {
  console.log('🌱 Seeding Categories (Idempotent Check)...');
  // Categories are organized in a Macro -> Sub hierarchy.
  // We also configure 'Automation Hints' (Default Asset/Goal) here.

  const longTermSavingsGoal = await prisma.savingsGoal.findFirst({
    where: { name: SEED_GOAL_NAMES.LONG_TERM_SAVINGS },
  });

  for (const macro of SEED_DATA) {
    let createdMacro = await prisma.category.findFirst({
      where: {
        name: macro.name,
        parentId: null,
      },
    });

    if (createdMacro) {
      // Update logic if needed
    } else {
      createdMacro = await prisma.category.create({
        data: {
          name: macro.name,
          type: macro.type,
          icon: macro.icon,
          isSystem: true,
          isVerified: true,
          parentId: null,
        },
      });
    }

    if (!categoryMap[macro.name]) categoryMap[macro.name] = {};

    for (const sub of macro.subs) {
      // Determine Default Asset
      let defaultAssetId: string | null = null;
      if (
        macro.name === SEED_CATEGORIES.FINANCIAL.NAME &&
        sub.name === SEED_CATEGORIES.FINANCIAL.INVESTMENTS
      ) {
        defaultAssetId = assetMap[SEED_ASSET_NAMES.ETF_PORTFOLIO];
      }
      if (
        macro.name === SEED_CATEGORIES.INCOME.NAME &&
        sub.name === SEED_CATEGORIES.INCOME.SALARY
      ) {
        defaultAssetId = assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT];
      }

      // AUTOMATION BRIDGE: Link specific categories to Assets and Savings Goals.
      // Any transaction uploaded with these categories will automatically
      // contribute to the linked balance/goal.
      let defaultGoalId: string | null = null;
      if (
        macro.name === SEED_CATEGORIES.FINANCIAL.NAME &&
        sub.name === SEED_CATEGORIES.FINANCIAL.INVESTMENTS
      ) {
        defaultGoalId = longTermSavingsGoal?.id || null;
      }

      const subCat = await prisma.category.upsert({
        where: {
          name_parentId: {
            name: sub.name,
            parentId: createdMacro.id,
          },
        },
        update: {
          type: sub.type,
          isSystem: true,
          isVerified: true,
          defaultAssetId: defaultAssetId,
          defaultGoalId: defaultGoalId,
        },
        create: {
          name: sub.name,
          type: sub.type,
          parentId: createdMacro.id,
          isSystem: true,
          isVerified: true,
          defaultAssetId: defaultAssetId,
          defaultGoalId: defaultGoalId,
        },
      });

      categoryMap[macro.name][sub.name] = subCat.id;
    }
  }
  console.log('✅ Categories seeded & linked to Assets.');
}

async function seedTransactions() {
  console.log('🌱 Seeding 2025 Transactions...');

  await prisma.enrichedTransaction.deleteMany({
    where: { importBatchId: SEED_BATCH_ID },
  });

  const transactions: Prisma.EnrichedTransactionCreateManyInput[] = [];
  const seedHashes = new Set<string>();
  const accountId = SEED_ACCOUNTS.SEED_ACCOUNT;

  const addSeedTransaction = (txInput: {
    date: Date;
    amount: Prisma.Decimal;
    details: string;
    account: string;
    operation: string;
    categoryId: string;
    assetId?: string | null;
    savingsGoalId?: string | null;
  }) => {
    let finalAmount = txInput.amount;
    const finalDate = txInput.date;
    let hash = generateTransactionHash({
      date: finalDate,
      amount: finalAmount,
      details: txInput.details,
      account: txInput.account,
      operation: txInput.operation,
    });

    // Handle collision prevention during seeding loop
    let attempts = 0;
    while (seedHashes.has(hash) && attempts < 100) {
      // Tweak amount slightly to obtain a unique hash
      const randomAdjustment = getRandomAmount(0.01, 0.05);
      const isPositive = finalAmount.isPositive();
      finalAmount = isPositive
        ? finalAmount.plus(randomAdjustment)
        : finalAmount.minus(randomAdjustment);

      hash = generateTransactionHash({
        date: finalDate,
        amount: finalAmount,
        details: txInput.details,
        account: txInput.account,
        operation: txInput.operation,
      });
      attempts++;
    }

    seedHashes.add(hash);
    transactions.push({
      date: finalDate,
      amount: finalAmount,
      details: txInput.details,
      account: txInput.account,
      operation: txInput.operation,
      categoryId: txInput.categoryId,
      assetId: txInput.assetId,
      savingsGoalId: txInput.savingsGoalId,
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
      transactionHash: hash,
    });
  };

  const emergencyGoal = await prisma.savingsGoal.findFirst({
    where: { name: SEED_GOAL_NAMES.EMERGENCY_FUND },
  });

  for (let month = 0; month < 12; month++) {
    const year = 2025;

    // --- Income (Linked to Asset) ---
    addSeedTransaction({
      date: new Date(year, month, 27, 9, 0, 0),
      amount: new Prisma.Decimal(2450.0),
      details: SEED_DETAILS.SALARY,
      account: accountId,
      operation: SEED_OPERATIONS.TRANSFER,
      categoryId:
        categoryMap[SEED_CATEGORIES.INCOME.NAME][SEED_CATEGORIES.INCOME.SALARY],
      assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
    });

    // --- Rent ---
    addSeedTransaction({
      date: new Date(year, month, 5, 8, 30, 0),
      amount: new Prisma.Decimal(-500.0),
      details: SEED_DETAILS.RENT,
      account: accountId,
      operation: SEED_OPERATIONS.DIRECT_DEBIT,
      categoryId:
        categoryMap[SEED_CATEGORIES.HOME.NAME][SEED_CATEGORIES.HOME.RENT],
      assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
    });

    // --- Savings Goal (Emergency Fund) ---
    if (emergencyGoal) {
      addSeedTransaction({
        date: new Date(year, month, 10, 10, 0, 0),
        amount: new Prisma.Decimal(-100.0),
        details: SEED_DETAILS.EMERGENCY_DEPOSIT,
        account: accountId,
        operation: SEED_OPERATIONS.TRANSFER,
        categoryId:
          categoryMap[SEED_CATEGORIES.FINANCIAL.NAME][
            SEED_CATEGORIES.FINANCIAL.TRANSFERS_OUT
          ],
        assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
        savingsGoalId: emergencyGoal.id,
      });
    }

    // --- Investment (Linked to Asset) ---
    addSeedTransaction({
      date: new Date(year, month, 28, 10, 0, 0),
      amount: new Prisma.Decimal(-200.0),
      details: SEED_DETAILS.PAC_ETF,
      account: accountId,
      operation: SEED_OPERATIONS.TRANSFER,
      categoryId:
        categoryMap[SEED_CATEGORIES.FINANCIAL.NAME][
          SEED_CATEGORIES.FINANCIAL.INVESTMENTS
        ],
      assetId: assetMap[SEED_ASSET_NAMES.ETF_PORTFOLIO],
    });

    // --- Variable Expenses ---

    // Groceries
    for (let i = 0; i < 3; i++) {
      addSeedTransaction({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(40, 120)),
        details: SEED_DETAILS.SUPERMARKET,
        account: accountId,
        operation: SEED_OPERATIONS.CARD,
        categoryId:
          categoryMap[SEED_CATEGORIES.FOOD.NAME][
            SEED_CATEGORIES.FOOD.GROCERIES
          ],
        assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
      });
    }

    // Dining Out
    const diningCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < diningCount; i++) {
      addSeedTransaction({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(15, 60)),
        details: SEED_DETAILS.RESTAURANT,
        account: accountId,
        operation: SEED_OPERATIONS.CARD,
        categoryId:
          categoryMap[SEED_CATEGORIES.FOOD.NAME][
            SEED_CATEGORIES.FOOD.DINING_OUT
          ],
        assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
      });
    }

    // Shopping
    if (Math.random() > 0.7) {
      addSeedTransaction({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(20, 150)),
        details: SEED_DETAILS.AMAZON,
        account: accountId,
        operation: SEED_OPERATIONS.CARD,
        categoryId:
          categoryMap[SEED_CATEGORIES.SHOPPING.NAME][
            SEED_CATEGORIES.SHOPPING.ELECTRONICS
          ],
        assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
      });
    }

    // Utilities
    if (month % 2 === 0) {
      addSeedTransaction({
        date: new Date(year, month, 20),
        amount: new Prisma.Decimal(-getRandomAmount(80, 140)),
        details: SEED_DETAILS.ENERGY_BILL,
        account: accountId,
        operation: SEED_OPERATIONS.BILL,
        categoryId:
          categoryMap[SEED_CATEGORIES.HOME.NAME][
            SEED_CATEGORIES.HOME.UTILITIES
          ],
        assetId: assetMap[SEED_ASSET_NAMES.MAIN_ACCOUNT],
      });
    }
  }

  // Batch insert
  const batchSize = 500;
  for (let i = 0; i < transactions.length; i += batchSize) {
    const batch = transactions.slice(i, i + batchSize);
    await prisma.enrichedTransaction.createMany({
      data: batch,
    });
  }

  console.log(`✅ Seeded ${transactions.length} transactions.`);
}

async function seedBudgets() {
  console.log('🌱 Seeding Budget Rules...');
  const budgets = [
    {
      catId: categoryMap[SEED_CATEGORIES.HOME.NAME][SEED_CATEGORIES.HOME.RENT],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 550,
    },
    {
      catId:
        categoryMap[SEED_CATEGORIES.FOOD.NAME][SEED_CATEGORIES.FOOD.GROCERIES],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 350,
    },
    {
      catId:
        categoryMap[SEED_CATEGORIES.FOOD.NAME][SEED_CATEGORIES.FOOD.DINING_OUT],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 80,
    },
    {
      catId:
        categoryMap[SEED_CATEGORIES.FINANCIAL.NAME][
          SEED_CATEGORIES.FINANCIAL.INVESTMENTS
        ],
      type: BudgetRuleType.PERCENTAGE_OF_INCOME,
      limit: 10,
    },
  ];

  for (const b of budgets) {
    if (!b.catId) continue;
    await prisma.budgetRule.upsert({
      where: { categoryId: b.catId },
      update: {
        ruleType: b.type,
        limitValue: new Prisma.Decimal(b.limit),
      },
      create: {
        categoryId: b.catId,
        ruleType: b.type,
        limitValue: new Prisma.Decimal(b.limit),
      },
    });
  }
  console.log(`✅ Seeded ${budgets.length} budget rules.`);
}

async function main() {
  await prisma.assetHistory.deleteMany();
  await prisma.enrichedTransaction.deleteMany({
    where: { importBatchId: SEED_BATCH_ID },
  });
  await prisma.asset.deleteMany({ where: { institution: { not: null } } });
  await prisma.savingsGoal.deleteMany();

  // --- EXECUTION ORDER ---
  // We must seed Assets and Goals first so that Categories can reference them for automations.
  await seedAssets();
  await seedGoals();
  await seedCategories();
  await seedTransactions();
  await seedBudgets();
}

main()
  .catch((e: unknown) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
