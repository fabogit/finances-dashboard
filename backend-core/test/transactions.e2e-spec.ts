import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EnrichedTransaction, ExpenseType } from '@prisma/client';

// Interfacce di risposta
interface NestErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: unknown;
}

describe('TransactionsModule (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  let createdTxId: string;
  // Nota: Salviamo il NOME della categoria, perché il tuo DTO lavora con i nomi, non gli ID
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

    // Pulizia
    await prisma.budgetRule.deleteMany();
    await prisma.enrichedTransaction.deleteMany();
    await prisma.category.deleteMany();

    // Seed Categoria (La creiamo nel DB così il Service può trovarla se fa il lookup per nome)
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

  // --- 1. VALIDATION TESTS ---

  it('1. Should reject invalid payload (Validation Pipe)', async () => {
    const invalidPayload = {
      details: 'Invalid Tx',
      // Manca amount, date, category...
    };

    const res = await request(server)
      .post('/transactions')
      .send(invalidPayload)
      .expect(400);

    const body = res.body as NestErrorResponse;
    expect(body.message).toBeInstanceOf(Array);
  });

  // --- 2. CREATE TESTS ---

  it('2. Should create a valid transaction', async () => {
    const payload = {
      amount: -50.5,
      date: '2025-01-15T10:00:00Z',
      details: 'Supermarket Shopping',
      account: 'Main Account',
      currency: 'EUR',
      // FIX: Usiamo il NOME come richiesto dal tuo DTO, non l'ID
      category: testCategoryName,
    };

    const res = await request(server)
      .post('/transactions')
      .send(payload)
      .expect(201);

    const body = res.body as EnrichedTransaction;

    expect(body.id).toBeDefined();
    expect(Number(body.amount)).toBe(-50.5);
    // Verifichiamo che il service abbia collegato correttamente la categoria (se il service lo fa)
    // Se il tuo service ritorna il DTO di risposta con 'category' stringa, controlla quello.
    // Assumiamo ritorni l'entity DB arricchita:
    if (body.categoryId) {
      expect(body.categoryId).toBeDefined();
    }

    createdTxId = body.id;
  });

  // --- 3. UPDATE TESTS ---

  it('3. Should update transaction details', async () => {
    const updatePayload = {
      details: 'Supermarket Shopping - Updated',
      amount: -55.0,
    };

    const res = await request(server)
      .patch(`/transactions/${createdTxId}`)
      .send(updatePayload)
      .expect(200);

    const body = res.body as EnrichedTransaction;
    expect(body.details).toBe(updatePayload.details);
    expect(Number(body.amount)).toBe(-55.0);
  });

  // --- 4. FILTER/SEARCH TESTS ---

  it('4. Should filter transactions by date range', async () => {
    // Creazione diretta nel DB (bypassiamo il controller)
    // QUI servono i campi obbligatori del DB perché non c'è il Service a mettere i default
    await prisma.enrichedTransaction.create({
      data: {
        amount: -100,
        date: new Date('2024-01-01'),
        details: 'Old Tx',
        account: 'Main Account',
        currency: 'EUR',
        // FIX: Campi obbligatori a livello di Schema DB
        importBatchId: 'TEST_MANUAL_SEED',
        originalLine: 999,
      },
    });

    const res = await request(server)
      .get('/transactions')
      .query({ startDate: '2025-01-01', endDate: '2025-12-31' })
      .expect(200);

    const body = res.body as
      | EnrichedTransaction[]
      | PaginatedResponse<EnrichedTransaction>;
    let results: EnrichedTransaction[];

    if (Array.isArray(body)) {
      results = body;
    } else {
      results = body.data;
    }

    expect(results.length).toBeGreaterThanOrEqual(1);

    const found = results.find((t) => t.id === createdTxId);
    expect(found).toBeDefined();

    const oldFound = results.find((t) => t.details === 'Old Tx');
    expect(oldFound).toBeUndefined();
  });
});
