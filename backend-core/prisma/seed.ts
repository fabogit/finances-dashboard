import {
  PrismaClient,
  ExpenseType,
  BudgetRuleType,
  Prisma,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
const SEED_BATCH_ID = 'SEED_2025_v1';

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
      createdMacro = await prisma.category.update({
        where: { id: createdMacro.id },
        data: {
          icon: macro.icon,
          type: macro.type,
          isSystem: true,
          isVerified: true,
        },
      });
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

    console.log(`✅ Macro: ${createdMacro.name}`);

    if (!categoryMap[macro.name]) categoryMap[macro.name] = {};

    for (const sub of macro.subs) {
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
        },
        create: {
          name: sub.name,
          type: sub.type,
          parentId: createdMacro.id,
          isSystem: true,
          isVerified: true,
        },
      });

      categoryMap[macro.name][sub.name] = subCat.id;
    }
    console.log(`   └─ Processed ${macro.subs.length} sub-categories`);
  }
}

async function seedTransactions() {
  console.log('🌱 Seeding 2025 Transactions...');

  const deleted = await prisma.enrichedTransaction.deleteMany({
    where: { importBatchId: SEED_BATCH_ID },
  });

  if (deleted.count > 0) {
    console.log(`🧹 Cleared ${deleted.count} old seed transactions.`);
  }

  const transactions: Prisma.EnrichedTransactionCreateManyInput[] = [];
  const accountId = 'SEED_ACCOUNT';

  for (let month = 0; month < 12; month++) {
    const year = 2025;

    // --- FIXED ---

    // --- Income ---
    transactions.push({
      date: new Date(year, month, 15, 9, 0, 0),
      amount: new Prisma.Decimal(2450.0),
      details: 'Tech Solutions Salary',
      account: accountId,
      operation: 'Transfer',
      categoryId: categoryMap['INCOME']['Salary & Pension'],
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
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // Investment
    transactions.push({
      date: new Date(year, month, 25, 10, 0, 0),
      amount: new Prisma.Decimal(-200.0),
      details: 'Monthly ETF Investment',
      account: accountId,
      operation: 'Transfer',
      categoryId: categoryMap['FINANCIAL']['Investments'],
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // Internet
    transactions.push({
      date: new Date(year, month, 10),
      amount: new Prisma.Decimal(-29.9),
      details: 'Fiber Provider',
      account: accountId,
      operation: 'DD',
      categoryId: categoryMap['HOME']['Internet & Phone'],
      importBatchId: SEED_BATCH_ID,
      originalLine: 0,
    });

    // --- VARIABLE ---

    // Groceries
    for (let i = 0; i < 3; i++) {
      transactions.push({
        date: getRandomDateInMonth(year, month),
        amount: new Prisma.Decimal(-getRandomAmount(40, 120)),
        details: 'Supermarket',
        account: accountId,
        operation: 'Card',
        categoryId: categoryMap['FOOD']['Groceries'],
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

  // Definiamo i budget usando gli ID salvati nella categoryMap
  const budgets = [
    // 1. Rent: Fisso 550€ (Ne spendiamo 500) -> Status atteso: OK
    {
      catId: categoryMap['HOME']['Rent'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 550,
    },
    // 2. Groceries: Fisso 350€ (Ne spendiamo circa 320) -> Status atteso: WARNING
    {
      catId: categoryMap['FOOD']['Groceries'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 350,
    },
    // 3. Dining Out: Fisso 80€ (Ne spendiamo circa 100-150) -> Status atteso: EXCEEDED
    {
      catId: categoryMap['FOOD']['Dining Out'],
      type: BudgetRuleType.FIXED_AMOUNT,
      limit: 80,
    },
    // 4. Investments: 10% dell'Income (245€) (Ne spendiamo 200) -> Status atteso: WARNING (200/245 = 0.81)
    {
      catId: categoryMap['FINANCIAL']['Investments'],
      type: BudgetRuleType.PERCENTAGE_OF_INCOME,
      limit: 10, // 10%
    },
  ];

  for (const b of budgets) {
    if (!b.catId) continue; // Skip se per qualche motivo l'ID manca

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
