import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/app-setup';
import { AssetType, GoalStatus } from '@prisma/client';

const API_PREFIX = '/api/v1';

describe('Serialization and Validation (E2E)', () => {
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Asset History Serialization', () => {
    it('GET /assets/:id - should include balance history', async () => {
      // 1. Create an asset
      const asset = await prisma.asset.create({
        data: {
          name: 'Test History Asset',
          type: AssetType.CASH,
          balance: 150.0,
        },
      });

      // 2. Create history entries
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          balance: 150.0,
          date: new Date(),
        },
      });

      // 3. Fetch details via E2E HTTP call
      const res = await request(server)
        .get(`${API_PREFIX}/assets/${asset.id}`)
        .expect(200);

      const body = res.body as {
        id: string;
        name: string;
        history: Array<{ balance: number | string }>;
      };

      expect(body.id).toBe(asset.id);
      expect(body.name).toBe(asset.name);
      expect(body.history).toBeDefined();
      expect(Array.isArray(body.history)).toBe(true);
      expect(body.history.length).toBeGreaterThanOrEqual(1);
      expect(Number(body.history[0].balance)).toBe(150.0);

      // Clean up
      await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
      await prisma.asset.delete({ where: { id: asset.id } });
    });
  });

  describe('Savings Goal Transactions Serialization', () => {
    it('GET /goals/:id - should include contributing transactions', async () => {
      // 1. Create a Goal
      const goal = await prisma.savingsGoal.create({
        data: {
          name: 'Test Goal',
          targetAmount: 500.0,
          currentAmount: 100.0,
          status: GoalStatus.ACTIVE,
        },
      });

      // 2. Create a Category and Transaction contributing to the goal
      const category = await prisma.category.create({
        data: {
          name: 'Savings Category',
          isSystem: false,
          isVerified: false,
        },
      });

      const transaction = await prisma.enrichedTransaction.create({
        data: {
          importBatchId: 'TEST_MANUAL',
          originalLine: 1,
          date: new Date(),
          amount: 100.0,
          details: 'Goal Contribution',
          categoryId: category.id,
          savingsGoalId: goal.id,
        },
      });

      // 3. Fetch goal details via E2E HTTP call
      const res = await request(server)
        .get(`${API_PREFIX}/goals/${goal.id}`)
        .expect(200);

      const body = res.body as {
        id: string;
        name: string;
        transactions: Array<{ id: string; amount: number | string }>;
      };

      expect(body.id).toBe(goal.id);
      expect(body.name).toBe(goal.name);
      expect(body.transactions).toBeDefined();
      expect(Array.isArray(body.transactions)).toBe(true);
      expect(body.transactions.length).toBeGreaterThanOrEqual(1);
      expect(body.transactions[0].id).toBe(transaction.id);
      expect(Number(body.transactions[0].amount)).toBe(100.0);

      // Clean up
      await prisma.enrichedTransaction.deleteMany({
        where: { savingsGoalId: goal.id },
      });
      await prisma.category.delete({ where: { id: category.id } });
      await prisma.savingsGoal.delete({ where: { id: goal.id } });
    });
  });

  describe('Analytics Forecast Error Serialization', () => {
    it('GET /analytics/forecast - should return error payload when DB is empty', async () => {
      // Clean DB to guarantee empty forecast input
      await prisma.enrichedTransaction.deleteMany();

      const res = await request(server)
        .get(`${API_PREFIX}/analytics/forecast`)
        .expect(200);

      const body = res.body as { error: string };

      expect(body.error).toBeDefined();
      expect(typeof body.error).toBe('string');
    });
  });

  describe('Transaction Disconnect Relationship Validation', () => {
    it('PATCH /transactions/:id - should allow null to disconnect asset/goal', async () => {
      // 1. Create Category, Asset, Goal
      const category = await prisma.category.create({
        data: { name: 'Temp Cat', isSystem: false },
      });
      const asset = await prisma.asset.create({
        data: { name: 'Temp Asset', type: AssetType.CASH, balance: 100 },
      });
      const goal = await prisma.savingsGoal.create({
        data: { name: 'Temp Goal', targetAmount: 200 },
      });

      // 2. Create Transaction linked to Asset and Goal via HTTP POST
      const txRes = await request(server)
        .post(`${API_PREFIX}/transactions`)
        .send({
          amount: 50.0,
          date: new Date().toISOString(),
          details: 'Temp Tx',
          category: category.name,
          assetId: asset.id,
          savingsGoalId: goal.id,
          account: 'Temp Account',
        })
        .expect(201);

      const tx = txRes.body as { id: string };

      // Verify DB balance updated
      const initialAsset = await prisma.asset.findUnique({
        where: { id: asset.id },
      });
      expect(Number(initialAsset?.balance)).toBe(150.0); // 100 + 50

      // 3. E2E Patch call sending null to disconnect asset and goal
      const res = await request(server)
        .patch(`${API_PREFIX}/transactions/${tx.id}`)
        .send({
          assetId: null,
          savingsGoalId: null,
        })
        .expect(200);

      const body = res.body as {
        assetId: string | null;
        savingsGoalId: string | null;
      };

      expect(body.assetId).toBeNull();
      expect(body.savingsGoalId).toBeNull();

      // Verify balance was reverted in the database
      const finalAsset = await prisma.asset.findUnique({
        where: { id: asset.id },
      });
      expect(Number(finalAsset?.balance)).toBe(100.0); // 150 - 50 (reverted)

      // Clean up
      await prisma.enrichedTransaction.deleteMany({
        where: { categoryId: category.id },
      });
      await prisma.category.delete({ where: { id: category.id } });
      await prisma.assetHistory.deleteMany({ where: { assetId: asset.id } });
      await prisma.asset.delete({ where: { id: asset.id } });
      await prisma.savingsGoal.delete({ where: { id: goal.id } });
    });
  });
});
