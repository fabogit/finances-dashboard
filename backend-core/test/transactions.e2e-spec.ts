import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpenseType } from '@prisma/client';
import {
  TransactionDto,
  PaginatedTransactionsResponseDto,
} from '../src/modules/transactions/dto/transaction.dto';

interface NestErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

describe('TransactionsModule (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  let createdTxId: string;
  const testCategoryName = 'Test Grocery';

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

    await prisma.category.create({
      data: {
        name: testCategoryName,
        type: ExpenseType.NEEDS,
        icon: '🍎',
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. Should reject invalid payload (Validation Pipe)', async () => {
    const invalidPayload = {
      details: 'Invalid Tx',
    };

    const res = await request(server)
      .post('/transactions')
      .send(invalidPayload)
      .expect(400);
    const body = res.body as NestErrorResponse;

    expect(body.message).toBeInstanceOf(Array);
  });

  it('2. Should create a valid transaction', async () => {
    const payload = {
      amount: -50.5,
      date: '2025-01-15T10:00:00Z',
      details: 'Supermarket Shopping',
      account: 'Main Account',
      currency: 'EUR',
      category: testCategoryName,
    };

    const res = await request(server)
      .post('/transactions')
      .send(payload)
      .expect(201);
    const body = res.body as TransactionDto;

    if (body.id) {
      createdTxId = body.id;
    }

    expect(body.id).toBeDefined();
    expect(Number(body.amount)).toBe(-50.5);

    const categoryResponse = body.category as unknown as { name: string };
    expect(categoryResponse.name).toBe(testCategoryName);
  });

  it('3. Should update transaction details', async () => {
    if (!createdTxId)
      throw new Error('Skipping update test: No Transaction ID created');

    const updatePayload = {
      details: 'Supermarket Shopping - Updated',
      amount: -55.0,
    };

    const res = await request(server)
      .patch(`/transactions/${createdTxId}`)
      .send(updatePayload)
      .expect(200);
    const body = res.body as TransactionDto;

    expect(body.details).toBe(updatePayload.details);
    expect(Number(body.amount)).toBe(-55.0);
  });

  it('4. Should filter transactions by date range', async () => {
    // Seed
    await prisma.enrichedTransaction.create({
      data: {
        amount: -100,
        date: new Date('2024-01-01'),
        details: 'Old Tx',
        account: 'Main Account',
        currency: 'EUR',
        importBatchId: 'TEST_MANUAL_SEED',
        originalLine: 999,
      },
    });

    const res = await request(server)
      .get('/transactions')
      .query({ startDate: '2025-01-01', endDate: '2025-12-31' })
      .expect(200);

    const body = res.body as PaginatedTransactionsResponseDto;
    const results = body.data;

    expect(results.length).toBeGreaterThanOrEqual(1);

    if (createdTxId) {
      const found = results.find((t) => t.id === createdTxId);
      expect(found).toBeDefined();
    }

    const oldFound = results.find((t) => t.details === 'Old Tx');
    expect(oldFound).toBeUndefined();
  });

  it('5. Should search transactions by text (details)', async () => {
    const res = await request(server)
      .get('/transactions')
      .query({ search: 'Supermarket' }) // Query param
      .expect(200);
    const body = res.body as PaginatedTransactionsResponseDto;
    const results = body.data;

    expect(results.length).toBe(1);
    expect(results[0].id).toBe(createdTxId);
    expect(results[0].details).toContain('Supermarket');
  });
});
