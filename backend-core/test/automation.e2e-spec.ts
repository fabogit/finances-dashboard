import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AssetType, ExpenseType } from '@prisma/client';
import { configureApp } from '../src/app-setup';

const API_PREFIX = '/api/v1';

describe('Automation Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    server = app.getHttpServer() as Server;

    // Cleanup before tests
    await prisma.enrichedTransaction.deleteMany();
    await prisma.savingsGoal.deleteMany();
    await prisma.category.deleteMany();
    await prisma.assetHistory.deleteMany();
    await prisma.asset.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Should automatically update Goal and Asset balances when a Transaction is created via a linked Category', async () => {
    // 1. Setup: Create Asset
    const asset = await prisma.asset.create({
      data: {
        name: 'Test ETF Portfolio',
        type: AssetType.INVESTMENT,
        balance: 1000,
        currency: 'EUR',
      },
    });

    // 2. Setup: Create Savings Goal linked to that Asset
    const goal = await prisma.savingsGoal.create({
      data: {
        name: 'House Downpayment',
        targetAmount: 50000,
        currentAmount: 0,
        assetId: asset.id,
      },
    });

    // 3. Setup: Create Category linked to that Goal and Asset
    await prisma.category.create({
      data: {
        name: 'Investments Account',
        type: ExpenseType.SAVINGS,
        defaultGoalId: goal.id,
        defaultAssetId: asset.id,
      },
    });

    // 4. Action: Create a Transaction with that Category
    const transactionPayload = {
      date: new Date().toISOString(),
      amount: 500.0,
      details: 'Monthly ETF Contribution',
      account: 'Bank Transfer',
      operation: 'INVESTMENT',
      category: 'Investments Account',
    };

    await request(server)
      .post(`${API_PREFIX}/transactions`)
      .send(transactionPayload)
      .expect(201);

    // 5. Verification: Check Goal Balance
    const updatedGoal = await prisma.savingsGoal.findUnique({
      where: { id: goal.id },
    });
    expect(Number(updatedGoal?.currentAmount)).toBe(500);

    // 6. Verification: Check Asset Balance
    const updatedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    });
    // Original 1000 + 500 = 1500
    expect(Number(updatedAsset?.balance)).toBe(1500);

    // 7. Verification: Check Transaction back-links
    const createdTx = await prisma.enrichedTransaction.findFirst({
      where: { details: 'Monthly ETF Contribution' },
    });
    expect(createdTx?.savingsGoalId).toBe(goal.id);
    expect(createdTx?.assetId).toBe(asset.id);
  });
});
