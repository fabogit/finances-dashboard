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

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// --- DATA STRUCTURES ---

const SEED_DATA = [
  {
    name: 'INCOME',
    type: ExpenseType.UNCLASSIFIED,
    icon: '💰',
    subs: [
      { name: 'Salary & Pension', type: ExpenseType.UNCLASSIFIED },
      { name: 'Transfers In', type: ExpenseType.UNCLASSIFIED },
      { name: 'Other Income', type: ExpenseType.UNCLASSIFIED },
      { name: 'Refunds', type: ExpenseType.UNCLASSIFIED },
      { name: 'Investments Returns', type: ExpenseType.SAVINGS },
    ],
  },
  {
    name: 'HOME',
    type: ExpenseType.NEEDS,
    icon: '🏠',
    subs: [
      { name: 'Rent', type: ExpenseType.NEEDS },
      { name: 'Utilities', type: ExpenseType.NEEDS },
      { name: 'Internet & Phone', type: ExpenseType.NEEDS },
      { name: 'Mobile Phone', type: ExpenseType.NEEDS },
      { name: 'Home Misc', type: ExpenseType.NEEDS },
      { name: 'Furniture & Garden', type: ExpenseType.WANTS },
    ],
  },
  {
    name: 'FOOD',
    type: ExpenseType.NEEDS,
    icon: '🍔',
    subs: [
      { name: 'Groceries', type: ExpenseType.NEEDS },
      { name: 'Dining Out', type: ExpenseType.WANTS },
    ],
  },
  {
    name: 'SHOPPING',
    type: ExpenseType.WANTS,
    icon: '🛍️',
    subs: [
      { name: 'Clothing', type: ExpenseType.WANTS },
      { name: 'Electronics', type: ExpenseType.WANTS },
      { name: 'Media', type: ExpenseType.WANTS },
    ],
  },
  {
    name: 'TRANSPORT',
    type: ExpenseType.NEEDS,
    icon: '🚗',
    subs: [
      { name: 'Fuel', type: ExpenseType.NEEDS },
      { name: 'Public Transport & Taxi', type: ExpenseType.NEEDS },
      { name: 'Travel Tickets', type: ExpenseType.WANTS },
      { name: 'Transport Misc', type: ExpenseType.NEEDS },
    ],
  },
  {
    name: 'HEALTH',
    type: ExpenseType.NEEDS,
    icon: '💊',
    subs: [
      { name: 'Medical Visits', type: ExpenseType.NEEDS },
      { name: 'Pharmacy', type: ExpenseType.NEEDS },
      { name: 'Personal Care', type: ExpenseType.NEEDS },
      { name: 'Health Misc', type: ExpenseType.NEEDS },
    ],
  },
  {
    name: 'LEISURE',
    type: ExpenseType.WANTS,
    icon: '🎉',
    subs: [
      { name: 'Travel & Holidays', type: ExpenseType.WANTS },
      { name: 'Entertainment', type: ExpenseType.WANTS },
      { name: 'Events & Museums', type: ExpenseType.WANTS },
      { name: 'Sports & Courses', type: ExpenseType.WANTS },
      { name: 'Leisure Misc', type: ExpenseType.WANTS },
      { name: 'Memberships', type: ExpenseType.WANTS },
    ],
  },
  {
    name: 'FINANCIAL',
    type: ExpenseType.NEEDS,
    icon: '🏦',
    subs: [
      { name: 'Transfers Out', type: ExpenseType.UNCLASSIFIED },
      { name: 'Cash Withdrawal', type: ExpenseType.UNCLASSIFIED },
      { name: 'Taxes & Fees', type: ExpenseType.NEEDS },
      { name: 'Bank Charges', type: ExpenseType.NEEDS },
      { name: 'Investments', type: ExpenseType.SAVINGS },
      { name: 'Donations', type: ExpenseType.WANTS },
    ],
  },
  {
    name: 'OTHER',
    type: ExpenseType.UNCLASSIFIED,
    icon: '❓',
    subs: [{ name: 'Misc Expenses', type: ExpenseType.UNCLASSIFIED }],
  },
];

const categoryMap: Record<string, Record<string, string>> = {};
const assetMap: Record<string, string> = {};
const SEED_BATCH_ID = 'SEED_2025_v2_WEALTH';

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

// --- SEEDING FUNCTIONS ---

async function seedAssets() {
  console.log('🌱 Seeding Assets & History...');

  // 1. Cash: Main Bank Account
  const mainAccount = await prisma.asset.create({
    data: {
      name: 'Main Account',
      type: AssetType.CASH,
      institution: 'Intesa Sanpaolo',
      balance: 5400.0,
      currency: 'EUR',
    },
  });
  assetMap['Main Account'] = mainAccount.id;

  // 2. Investment: ETF Portfolio (Accumulating)
  const etfPortfolio = await prisma.asset.create({
    data: {
      name: 'ETF World Portfolio',
      type: AssetType.INVESTMENT,
      institution: 'Directa',
      balance: 15200.0,
      currency: 'EUR',
    },
  });
  assetMap['ETF Portfolio'] = etfPortfolio.id;

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
      name: 'Car Loan',
      type: AssetType.DEBT,
      institution: 'Findomestic',
      balance: 8500.0,
      currency: 'EUR',
    },
  });
  assetMap['Car Loan'] = carLoan.id;

  console.log('✅ Assets created.');
}

async function seedGoals() {
  console.log('🌱 Seeding Savings Goals...');
  await prisma.savingsGoal.create({
    data: {
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 2500,
      status: GoalStatus.ACTIVE,
      icon: '🛡️',
      color: '#32a852',
    },
  });
  console.log('✅ Goals created.');
}

async function seedCategories() {
  console.log('🌱 Seeding Categories (Idempotent Check)...');

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

      // AUTOMATION: Link 'Investments' category to 'ETF Portfolio' Asset
      if (macro.name === 'FINANCIAL' && sub.name === 'Investments') {
        defaultAssetId = assetMap['ETF Portfolio'];
      }
      // AUTOMATION: Link 'Salary' to 'Main Account'
      if (macro.name === 'INCOME' && sub.name === 'Salary & Pension') {
        defaultAssetId = assetMap['Main Account'];
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
          defaultAssetId: defaultAssetId, // <--- Link Asset
        },
        create: {
          name: sub.name,
          type: sub.type,
          parentId: createdMacro.id,
          isSystem: true,
          isVerified: true,
          defaultAssetId: defaultAssetId, // <--- Link Asset
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
  const accountId = 'SEED_ACCOUNT';

  for (let month = 0; month < 12; month++) {
    const year = 2025;

    // --- Income (Linked to Asset) ---
    transactions.push({
      date: new Date(year, month, 27, 9, 0, 0),
      amount: new Prisma.Decimal(2450.0),
      details: 'Tech Solutions Salary',
      account: accountId,
      operation: 'Transfer',
      categoryId: categoryMap['INCOME']['Salary & Pension'],
      assetId: assetMap['Main Account'], // Linked!
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // --- Rent ---
    transactions.push({
      date: new Date(year, month, 5, 8, 30, 0),
      amount: new Prisma.Decimal(-500.0),
      details: 'Monthly Rent',
      account: accountId,
      operation: 'Direct Debit',
      categoryId: categoryMap['HOME']['Rent'],
      assetId: assetMap['Main Account'], // Linked (Source of funds)
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // --- Investment (Linked to Asset) ---
    transactions.push({
      date: new Date(year, month, 28, 10, 0, 0),
      amount: new Prisma.Decimal(-200.0),
      details: 'Pac ETF World',
      account: accountId,
      operation: 'Transfer',
      categoryId: categoryMap['FINANCIAL']['Investments'],
      assetId: assetMap['ETF Portfolio'], // Linked!
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // --- Variable Expenses ---
    // Groceries
    for (let i = 0; i < 3; i++) {
      transactions.push({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(40, 120)),
        details: 'Supermarket',
        account: accountId,
        operation: 'Card',
        categoryId: categoryMap['FOOD']['Groceries'],
        assetId: assetMap['Main Account'],
        importBatchId: SEED_BATCH_ID,
        originalLine: 0,
      });
    }

    // Dining Out
    const diningCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < diningCount; i++) {
      transactions.push({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(15, 60)),
        details: 'Restaurant / UberEats',
        account: accountId,
        operation: 'Card',
        categoryId: categoryMap['FOOD']['Dining Out'],
        assetId: assetMap['Main Account'],
        importBatchId: SEED_BATCH_ID,
        originalLine: 0,
      });
    }

    // Shopping
    if (Math.random() > 0.7) {
      transactions.push({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(20, 150)),
        details: 'Amazon Purchase',
        account: accountId,
        operation: 'Card',
        categoryId: categoryMap['SHOPPING']['Electronics'],
        assetId: assetMap['Main Account'],
        importBatchId: SEED_BATCH_ID,
        originalLine: 0,
      });
    }

    // Utilities
    if (month % 2 === 0) {
      transactions.push({
        date: new Date(year, month, 20),
        amount: new Prisma.Decimal(-getRandomAmount(80, 140)),
        details: 'Energy Bill',
        account: accountId,
        operation: 'Bill',
        categoryId: categoryMap['HOME']['Utilities'],
        assetId: assetMap['Main Account'],
        importBatchId: SEED_BATCH_ID,
        originalLine: 0,
      });
    }
  }

  // Batch insert
  const batchSize = 100;
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
      catId: categoryMap['HOME']['Rent'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 550,
    },
    {
      catId: categoryMap['FOOD']['Groceries'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 350,
    },
    {
      catId: categoryMap['FOOD']['Dining Out'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 80,
    },
    {
      catId: categoryMap['FINANCIAL']['Investments'],
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

  // ORDINE ESECUZIONE
  await seedAssets();
  await seedGoals();
  await seedCategories();
  await seedTransactions();
  await seedBudgets();
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
