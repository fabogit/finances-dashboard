import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Precision Verification (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.enrichedTransaction.deleteMany({
      where: { details: { contains: 'PRECISION_TEST' } },
    });
    await prisma.asset.deleteMany({
      where: { name: { contains: 'PRECISION_TEST' } },
    });
    await app.close();
  });

  it('should maintain exact precision when adding 0.1 and 0.2 (Float Trap)', async () => {
    const appServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    // 1. Create an asset with 0.0 balance
    const assetResponse = await request(appServer)
      .post('/assets')
      .send({
        name: 'PRECISION_TEST_ASSET',
        type: 'CASH',
        balance: 0,
        currency: 'EUR',
      })
      .expect(201);

    const assetBody = assetResponse.body as { id: string };
    const assetId = assetBody.id;

    // 2. Add a transaction of 0.1
    await request(appServer)
      .post('/transactions')
      .send({
        date: new Date().toISOString(),
        amount: 0.1,
        details: 'PRECISION_TEST_1',
        category: 'UNCATEGORIZED',
        assetId: assetId,
        operation: 'NONE',
      })
      .expect(201);

    // 3. Add a transaction of 0.2
    await request(appServer)
      .post('/transactions')
      .send({
        date: new Date().toISOString(),
        amount: 0.2,
        details: 'PRECISION_TEST_2',
        category: 'UNCATEGORIZED',
        assetId: assetId,
        operation: 'NONE',
      })
      .expect(201);

    // 4. Check the asset balance
    const finalAssetResponse = await request(appServer)
      .get(`/assets/${assetId}`)
      .expect(200);

    // If it were a JS float trap, it would be 0.30000000000000004
    // We expect EXACTLY 0.3
    const finalBody = finalAssetResponse.body as { balance: number };
    expect(Number(finalBody.balance)).toBe(0.3);
  });

  it('should maintain precision during update reversion (0.3 - 0.1 - 0.2 = 0)', async () => {
    const appServer = app.getHttpServer() as unknown as Parameters<
      typeof request
    >[0];
    const assetResponse = await request(appServer)
      .post('/assets')
      .send({
        name: 'PRECISION_TEST_ASSET_2',
        type: 'CASH',
        balance: 0.3,
        currency: 'EUR',
      })
      .expect(201);

    const assetBody = assetResponse.body as { id: string };
    const assetId = assetBody.id;

    const txResponse = await request(appServer)
      .post('/transactions')
      .send({
        date: new Date().toISOString(),
        amount: 0.1,
        details: 'PRECISION_TEST_3',
        category: 'UNCATEGORIZED',
        assetId: assetId,
        operation: 'NONE',
      })
      .expect(201);

    const txBody = txResponse.body as { id: string };
    const txId = txBody.id;

    // Update transaction to 0.2
    // This triggers: (0.3 - 0.1) + 0.2 = 0.4? No, revert means UNDO.
    // Asset started at 0.3. Tx 0.1 created -> 0.4.
    // Patch 0.1 to 0.2 -> Revert 0.1 (0.3), Apply 0.2 (0.5).
    await request(appServer)
      .patch(`/transactions/${txId}`)
      .send({ amount: 0.2 })
      .expect(200);

    const finalAssetResponse = await request(appServer)
      .get(`/assets/${assetId}`)
      .expect(200);

    const finalBody = finalAssetResponse.body as { balance: number };
    expect(Number(finalBody.balance)).toBe(0.5);
  });
});
