import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpenseType } from '@prisma/client';
import { CategoryResponseDto } from '../src/modules/categories/dto/category-response.dto';
import { configureApp } from '../src/app-setup';

const API_PREFIX = '/api/v1';

describe('CategoriesModule (E2E)', () => {
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

    await prisma.budgetRule.deleteMany();
    await prisma.enrichedTransaction.deleteMany();
    await prisma.category.deleteMany();

    await prisma.category.create({
      data: {
        name: 'UNCATEGORIZED',
        systemKey: 'UNCATEGORIZED',
        isSystem: true,
        isVerified: true,
        type: ExpenseType.UNCLASSIFIED,
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  let macroId: string;
  let subId: string;
  let targetId: string;

  it('1. Should create a MACRO category', async () => {
    const payload = {
      name: 'Test Macro',
      type: ExpenseType.NEEDS,
      icon: '🏠',
      parentId: null,
    };

    const res = await request(server)
      .post(`${API_PREFIX}/categories`)
      .send(payload)
      .expect(201);
    const body = res.body as CategoryResponseDto;

    expect(body.id).toBeDefined();
    expect(body.name).toBe(payload.name);
    expect(body.isSystem).toBe(false);

    macroId = body.id;
  });

  it('2. Should create a SUB category linked to the Macro', async () => {
    const payload = {
      name: 'Test Sub',
      type: ExpenseType.NEEDS,
      icon: '💡',
      parentId: macroId,
    };

    const res = await request(server)
      .post(`${API_PREFIX}/categories`)
      .send(payload)
      .expect(201);

    const body = res.body as CategoryResponseDto;
    expect(body.parentId).toBe(macroId);
    subId = body.id;
  });

  it('3. Should prevent Duplicate category names (in same level)', async () => {
    const payload = {
      name: 'Test Sub',
      type: ExpenseType.WANTS,
      icon: '🚫',
      parentId: macroId,
    };

    await request(server)
      .post(`${API_PREFIX}/categories`)
      .send(payload)
      .expect(409);
  });

  it('4. Should retrieve the Category Tree structure', async () => {
    const res = await request(server)
      .get(`${API_PREFIX}/categories`)
      .expect(200);
    const tree = res.body as CategoryResponseDto[];

    expect(Array.isArray(tree)).toBe(true);
    const myMacro = tree.find((c) => c.id === macroId);
    expect(myMacro).toBeDefined();

    if (myMacro?.children && myMacro.children.length > 0) {
      expect(myMacro.children[0].name).toBe('Test Sub');
    } else {
      throw new Error('Children not found or empty');
    }
  });

  it('5. Should create a TARGET category for reassigning', async () => {
    const payload = {
      name: 'Target Category',
      type: ExpenseType.NEEDS,
      icon: '🎯',
    };

    const res = await request(server)
      .post(`${API_PREFIX}/categories`)
      .send(payload)
      .expect(201);
    const body = res.body as CategoryResponseDto;
    targetId = body.id;
  });

  it('6. Should delete subcategory and re-route transactions to target category', async () => {
    // Create a transaction linked to subId category
    const transaction = await prisma.enrichedTransaction.create({
      data: {
        importBatchId: 'test-batch',
        originalLine: 1,
        date: new Date(),
        amount: -50.0,
        currency: 'EUR',
        categoryId: subId,
      },
    });

    // Delete subId and reassign to targetId
    await request(server)
      .delete(`${API_PREFIX}/categories/${subId}?reassignToId=${targetId}`)
      .expect(200);

    // Verify transaction was moved
    const updatedTransaction = await prisma.enrichedTransaction.findUnique({
      where: { id: transaction.id },
    });
    expect(updatedTransaction?.categoryId).toBe(targetId);
  });

  it('7. Should delete macro category, nullifying children parentIds and routing transactions to UNCATEGORIZED fallback', async () => {
    // Create a new sub-category linked to macroId
    const newSub = await prisma.category.create({
      data: {
        name: 'Another Sub',
        parentId: macroId,
        type: ExpenseType.NEEDS,
      },
    });

    // Create a transaction linked to macroId
    const transaction = await prisma.enrichedTransaction.create({
      data: {
        importBatchId: 'test-batch',
        originalLine: 2,
        date: new Date(),
        amount: -100.0,
        currency: 'EUR',
        categoryId: macroId,
      },
    });

    // Delete macroId without reassignToId (fallback to UNCATEGORIZED)
    await request(server)
      .delete(`${API_PREFIX}/categories/${macroId}`)
      .expect(200);

    // Verify child category parentId is nullified
    const updatedSub = await prisma.category.findUnique({
      where: { id: newSub.id },
    });
    expect(updatedSub?.parentId).toBeNull();

    // Verify transaction is reassigned to UNCATEGORIZED
    const fallbackCategory = await prisma.category.findFirst({
      where: { systemKey: 'UNCATEGORIZED' },
    });
    const updatedTransaction = await prisma.enrichedTransaction.findUnique({
      where: { id: transaction.id },
    });
    expect(updatedTransaction?.categoryId).toBe(fallbackCategory?.id);
  });

  it('8. Should prevent deletion of system fallback category', async () => {
    const fallbackCategory = await prisma.category.findFirst({
      where: { systemKey: 'UNCATEGORIZED' },
    });

    await request(server)
      .delete(`${API_PREFIX}/categories/${fallbackCategory?.id}`)
      .expect(403); // Forbidden
  });
});
