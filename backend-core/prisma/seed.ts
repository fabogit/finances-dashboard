import { PrismaClient, ExpenseType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
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

async function main() {
  console.log('🌱 Starting database seed...');

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

    for (const sub of macro.subs) {
      await prisma.category.upsert({
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
    }
    console.log(`   └─ Processed ${macro.subs.length} sub-categories`);
  }

  console.log('🏁 Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
