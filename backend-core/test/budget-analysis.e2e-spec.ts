import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  ExpenseType,
  BudgetRuleType,
  EnrichedTransaction,
} from '@prisma/client';
import { CategoryResponseDto } from '../src/modules/categories/dto/category-response.dto';
import { BudgetAnalysisResponseDto } from '../src/modules/analytics/dto/budget-analysis.dto';
import { CreateCategoryDto } from 'src/modules/categories/dto/create-category.dto';

const getCurrentMonth = () => new Date().toISOString().slice(0, 7);
const getCurrentISODate = () => new Date().toISOString();

describe('Budget Analysis Flow (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    server = app.getHttpServer() as Server;

    await prisma.budgetRule.deleteMany();
    await prisma.enrichedTransaction.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Scenario 1: Single Category Budget Overflow', () => {
    let categoryId: string;
    const catName = 'E2E Dining';

    it('1. Create Category', async () => {
      const payload: CreateCategoryDto = {
        name: catName,
        type: ExpenseType.NEEDS,
        icon: '🍔',
      };

      const res = await request(server)
        .post('/categories')
        .send(payload)
        .expect(201);
      const body = res.body as CategoryResponseDto;
      categoryId = body.id;
    });

    it('2. Set Budget (100€)', async () => {
      await request(server)
        .put(`/categories/${categoryId}/budget`)
        .send({ limitValue: 100, ruleType: BudgetRuleType.FIXED_AMOUNT })
        .expect(200);
    });

    it('3. Add Transaction (120€)', async () => {
      const res = await request(server)
        .post('/transactions')
        .send({
          amount: -120.0,
          date: getCurrentISODate(),
          details: 'Fancy Dinner',
          category: catName,
          account: 'Cash',
        })
        .expect(201);

      const tx = res.body as EnrichedTransaction;
      if (tx.categoryId !== categoryId) {
        throw new Error('Transaction linked to WRONG Category ID');
      }
    });

    it('4. Verify Analytics: Status should be EXCEEDED', async () => {
      const month = getCurrentMonth();
      const res = await request(server)
        .get(`/analytics/budget-analysis?month=${month}`)
        .expect(200);
      const analysis = res.body as BudgetAnalysisResponseDto;
      const catNode = analysis.categories.find(
        (c) => c.categoryName === catName,
      );

      if (!catNode) {
        throw new Error(`Category node "${catName}" not found in response`);
      }

      expect(catNode.limit).toBe(100);
      expect(Number(catNode.spent)).toBe(120);
      expect(catNode.status).toBe('EXCEEDED');
    });
  });

  describe('Scenario 2: Hierarchy Roll-up', () => {
    let parentId: string;
    const parentName = 'E2E Transport';
    const childName = 'E2E Fuel';

    it('1. Create Parent & Child Categories', async () => {
      const pRes = await request(server)
        .post('/categories')
        .send({ name: parentName, type: ExpenseType.NEEDS, icon: '🚗' })
        .expect(201);
      const pBody = pRes.body as CategoryResponseDto;
      parentId = pBody.id;

      await request(server)
        .post('/categories')
        .send({
          name: childName,
          type: ExpenseType.NEEDS,
          icon: '⛽',
          parentId: parentId,
        })
        .expect(201);
    });

    it('2. Set Budget on PARENT only (200€)', async () => {
      await request(server)
        .put(`/categories/${parentId}/budget`)
        .send({ limitValue: 200, ruleType: BudgetRuleType.FIXED_AMOUNT })
        .expect(200);
    });

    it('3. Add Transaction to CHILD (50€)', async () => {
      await request(server)
        .post('/transactions')
        .send({
          amount: -50,
          date: getCurrentISODate(),
          details: 'Gas Station',
          category: parentName,
          subCategory: childName,
          account: 'Card',
        })
        .expect(201);
    });

    it('4. Add Transaction to PARENT (100€)', async () => {
      await request(server)
        .post('/transactions')
        .send({
          amount: -100,
          date: getCurrentISODate(),
          details: 'Car Insurance',
          category: parentName,
          account: 'Bank',
        })
        .expect(201);
    });

    it('5. Verify Analytics: Parent Spent = 150', async () => {
      const month = getCurrentMonth();
      const res = await request(server)
        .get(`/analytics/budget-analysis?month=${month}`)
        .expect(200);
      const analysis = res.body as BudgetAnalysisResponseDto;

      const parentNode = analysis.categories.find(
        (c) => c.categoryName === parentName,
      );

      if (!parentNode) {
        throw new Error(`Parent node "${parentName}" not found`);
      }

      // 100 (Direct) + 50 (Child) = 150
      expect(Number(parentNode.spent)).toBe(150);
      expect(parentNode.limit).toBe(200);
      expect(parentNode.status).toBe('OK');
    });
  });
});
