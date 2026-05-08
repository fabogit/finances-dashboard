import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ExpenseType } from '@prisma/client';
import { CategoryResponseDto } from '../src/modules/categories/dto/category-response.dto';

describe('CategoriesModule (E2E)', () => {
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

  let macroId: string;

  it('1. Should create a MACRO category', async () => {
    const payload = {
      name: 'Test Macro',
      type: ExpenseType.NEEDS,
      icon: '🏠',
      parentId: null,
    };

    const res = await request(server)
      .post('/categories')
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
      .post('/categories')
      .send(payload)
      .expect(201);

    const body = res.body as CategoryResponseDto;
    expect(body.parentId).toBe(macroId);
  });

  it('3. Should prevent Duplicate category names (in same level)', async () => {
    const payload = {
      name: 'Test Sub',
      type: ExpenseType.WANTS,
      icon: '🚫',
      parentId: macroId,
    };

    await request(server).post('/categories').send(payload).expect(409);
  });

  it('4. Should retrieve the Category Tree structure', async () => {
    const res = await request(server).get('/categories').expect(200);
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

  it('5. Should Prevent Deletion of Category with Children', async () => {
    await request(server).delete(`/categories/${macroId}`).expect(409); // ConflictException
  });
});
