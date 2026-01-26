import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

    await prisma.enrichedTransaction.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Should connect to the TEST database', () => {
    const dbUrl = process.env.DATABASE_URL;
    console.log('🧪 Testing against DB:', dbUrl);
    expect(dbUrl).toContain('finance_test_db');
  });

  it('/analytics/summary (GET) - Should return empty summary', async () => {
    const server = app.getHttpServer() as Server;

    const response = await request(server)
      .get('/analytics/summary')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        balance: 0,
        expense: 0,
        income: 0,
        savingsRate: 0,
      }),
    );
  });
});
