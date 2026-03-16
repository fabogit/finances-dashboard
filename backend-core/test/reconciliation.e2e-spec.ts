import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpenseType } from '@prisma/client';

describe('Reconciliation & ACID Updates (E2E)', () => {
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

    // Cleanup
    await prisma.enrichedTransaction.deleteMany();
    await prisma.assetHistory.deleteMany();
    await prisma.asset.deleteMany();
    await prisma.category.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('Scenario 1: ACID Transaction Update (Revert and Apply)', async () => {
    // 1. Setup: Create Asset and Category
    const asset = await prisma.asset.create({
      data: { name: 'Test Card', balance: 100, type: 'CASH' },
    });
    const category = await prisma.category.create({
      data: { name: 'Groceries', type: ExpenseType.NEEDS, icon: '🛒' },
    });

    // 2. Create Transaction: -10 EUR
    const createRes = await request(server)
      .post('/transactions')
      .send({
        amount: -10,
        date: new Date().toISOString(),
        details: 'Initial Purchase',
        category: category.name,
        assetId: asset.id,
      })
      .expect(201);

    const txId = (createRes.body as { id: string }).id;

    // Verify Asset Balance -> 90
    let updatedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    });
    expect(Number(updatedAsset?.balance)).toBe(90);

    // 3. Update Transaction: Change amount to -30
    await request(server)
      .patch(`/transactions/${txId}`)
      .send({ amount: -30 })
      .expect(200);

    // Verify Asset Balance -> 70 (90 + 10 - 30)
    updatedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    });
    expect(Number(updatedAsset?.balance)).toBe(70);

    // 4. Update Transaction: Change asset
    const asset2 = await prisma.asset.create({
      data: { name: 'Second Card', balance: 50, type: 'CASH' },
    });

    await request(server)
      .patch(`/transactions/${txId}`)
      .send({ assetId: asset2.id })
      .expect(200);

    // Verify First Asset reverts -> 100
    const asset1Final = await prisma.asset.findUnique({
      where: { id: asset.id },
    });
    expect(Number(asset1Final?.balance)).toBe(100);

    // Verify Second Asset applies -> 20 (50 - 30)
    const asset2Final = await prisma.asset.findUnique({
      where: { id: asset2.id },
    });
    expect(Number(asset2Final?.balance)).toBe(20);
  });

  it('Scenario 2: Balance Reconciliation (Recalculate)', async () => {
    // 1. Setup: Create Asset with history
    const asset = await prisma.asset.create({
      data: { name: 'Drifting Asset', balance: 1000, type: 'CASH' },
    });
    // Create an anchor snapshot
    await prisma.assetHistory.create({
      data: { assetId: asset.id, balance: 1000, date: new Date('2026-01-01') },
    });

    // 2. Create Transactions after snapshot
    const cat = await prisma.category.findFirst({
      where: { name: 'Groceries' },
    });
    await prisma.enrichedTransaction.createMany({
      data: [
        {
          amount: -100,
          date: new Date('2026-02-01'),
          details: 'T1',
          assetId: asset.id,
          categoryId: cat!.id,
          importBatchId: 'M',
          operation: 'OP',
          account: 'A',
          originalLine: 1,
        },
        {
          amount: 250,
          date: new Date('2026-02-05'),
          details: 'T2',
          assetId: asset.id,
          categoryId: cat!.id,
          importBatchId: 'M',
          operation: 'OP',
          account: 'A',
          originalLine: 2,
        },
      ],
    });

    // Asset balance should be 1000 - 100 + 250 = 1150
    // 3. Manually simulate "drift" or error
    await prisma.asset.update({
      where: { id: asset.id },
      data: { balance: 9999 },
    });

    // 4. Trigger Recalculate
    const res = await request(server)
      .post(`/assets/${asset.id}/recalculate`)
      .expect(201); // Controller uses @Post which defaults to 201

    expect((res.body as { newBalance: number }).newBalance).toBe(1150);

    // Verify DB
    const finalAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    });
    expect(Number(finalAsset?.balance)).toBe(1150);
  });
});
