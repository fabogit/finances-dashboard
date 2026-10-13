import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AssetType, GoalStatus, ExpenseType } from '@prisma/client';
import { configureApp } from '../src/app-setup';
import { TransactionDto } from '../src/modules/transactions/dto/transaction.dto';

const API_PREFIX = '/api/v1';

describe('CRUD Transactions & Balance Reversion (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  let asset1Id: string;
  let asset2Id: string;
  let goalId: string;
  let categoryId: string;
  let createdTxId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    server = app.getHttpServer() as Server;

    // Clean DB
    await prisma.budgetRule.deleteMany();
    await prisma.enrichedTransaction.deleteMany();
    await prisma.category.deleteMany();
    await prisma.savingsGoal.deleteMany();
    await prisma.assetHistory.deleteMany();
    await prisma.asset.deleteMany();

    await prisma.category.create({
      data: {
        name: 'UNCATEGORIZED',
        systemKey: 'UNCATEGORIZED',
        isSystem: true,
        isVerified: true,
        type: ExpenseType.UNCLASSIFIED,
      },
    });

    // Create Test Assets
    const asset1 = await prisma.asset.create({
      data: {
        name: 'Main E2E Account',
        type: AssetType.CASH,
        institution: 'Intesa',
        balance: 1000.0,
      },
    });
    asset1Id = asset1.id;

    const asset2 = await prisma.asset.create({
      data: {
        name: 'Second E2E Account',
        type: AssetType.CASH,
        institution: 'Unicredit',
        balance: 500.0,
      },
    });
    asset2Id = asset2.id;

    // Create Test Goal
    const goal = await prisma.savingsGoal.create({
      data: {
        name: 'Car Fund',
        targetAmount: 5000.0,
        currentAmount: 100.0,
        status: GoalStatus.ACTIVE,
        assetId: asset1Id,
      },
    });
    goalId = goal.id;

    // Create Test Category with Automation Defaults
    const category = await prisma.category.create({
      data: {
        name: 'Leisure',
        type: ExpenseType.WANTS,
        icon: '🎉',
        defaultAssetId: asset1Id,
        defaultGoalId: goalId,
      },
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should create manual transaction and apply defaults and balances', async () => {
    const payload = {
      amount: -50.0,
      date: '2025-01-15T10:00:00Z',
      details: 'Concert Ticket',
      account: 'Main Account',
      category: 'Leisure',
    };

    const res = await request(server)
      .post(`${API_PREFIX}/transactions`)
      .send(payload)
      .expect(201);

    const body = res.body as unknown as TransactionDto;
    createdTxId = body.id;
    expect(createdTxId).toBeDefined();
    expect(body.assetId).toBe(asset1Id);
    expect(body.savingsGoalId).toBe(goalId);

    // Verify DB states
    const dbAsset = await prisma.asset.findUnique({ where: { id: asset1Id } });
    expect(Number(dbAsset?.balance)).toBe(950.0); // 1000 - 50

    const dbGoal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });
    expect(Number(dbGoal?.currentAmount)).toBe(50.0); // 100 - 50
  });

  it('2. Should update transaction amount and revert/apply balances correctly', async () => {
    const payload = {
      amount: -30.0,
    };

    await request(server)
      .patch(`${API_PREFIX}/transactions/${createdTxId}`)
      .send(payload)
      .expect(200);

    // Verify DB states (revert -50, apply -30)
    const dbAsset = await prisma.asset.findUnique({ where: { id: asset1Id } });
    expect(Number(dbAsset?.balance)).toBe(970.0); // 1000 - 30

    const dbGoal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });
    expect(Number(dbGoal?.currentAmount)).toBe(70.0); // 100 - 30
  });

  it('3. Should update transaction asset and revert old asset balance while applying to new asset', async () => {
    const payload = {
      assetId: asset2Id,
    };

    await request(server)
      .patch(`${API_PREFIX}/transactions/${createdTxId}`)
      .send(payload)
      .expect(200);

    // Verify DB states:
    // Old asset should revert the -30 back to 1000
    const dbAsset1 = await prisma.asset.findUnique({ where: { id: asset1Id } });
    expect(Number(dbAsset1?.balance)).toBe(1000.0);

    // New asset should receive the -30
    const dbAsset2 = await prisma.asset.findUnique({ where: { id: asset2Id } });
    expect(Number(dbAsset2?.balance)).toBe(470.0); // 500 - 30

    // Goal should remain unchanged
    const dbGoal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });
    expect(Number(dbGoal?.currentAmount)).toBe(70.0);
  });

  it('4. Should delete transaction and revert all balances perfectly', async () => {
    await request(server)
      .delete(`${API_PREFIX}/transactions/${createdTxId}`)
      .expect(200);

    // Verify DB states:
    // New asset should revert the -30 back to 500
    const dbAsset2 = await prisma.asset.findUnique({ where: { id: asset2Id } });
    expect(Number(dbAsset2?.balance)).toBe(500.0);

    // Goal should revert the -30 back to 100
    const dbGoal = await prisma.savingsGoal.findUnique({
      where: { id: goalId },
    });
    expect(Number(dbGoal?.currentAmount)).toBe(100.0);
  });

  it('5. Should reassign transactions to fallback UNCATEGORIZED category on category deletion', async () => {
    // Create a new transaction under our category first
    const payload = {
      amount: -10.0,
      date: '2025-01-16T10:00:00Z',
      details: 'Ice Cream',
      account: 'Main Account',
      category: 'Leisure',
    };

    const resPost = await request(server)
      .post(`${API_PREFIX}/transactions`)
      .send(payload)
      .expect(201);
    const txBody = resPost.body as unknown as TransactionDto;

    // Delete category Leisure -> should succeed (200) and reassign
    await request(server)
      .delete(`${API_PREFIX}/categories/${categoryId}`)
      .expect(200);

    // Verify transaction is now assigned to fallback UNCATEGORIZED
    const fallbackCategory = await prisma.category.findFirst({
      where: { systemKey: 'UNCATEGORIZED' },
    });
    const updatedTransaction = await prisma.enrichedTransaction.findUnique({
      where: { id: txBody.id },
    });
    expect(updatedTransaction?.categoryId).toBe(fallbackCategory?.id);
  });
});
