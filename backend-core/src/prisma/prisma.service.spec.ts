import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { execSync } from 'child_process';

describe('PrismaService', () => {
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useFactory: () => {
            // Using in memory db for tests
            return new PrismaService(':memory:');
          },
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    await prismaService.onModuleInit();

    const sql = execSync(
      'npx prisma migrate diff --from-empty --to-schema=./prisma/schema.prisma --script',
    ).toString();

    await prismaService.$executeRawUnsafe(sql);
  });

  afterEach(async () => {
    await prismaService.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(prismaService).toBeDefined();
  });

  it('should allow inserting data in memory', async () => {
    const created = await prismaService.rawTransaction.create({
      data: {
        importBatchId: 'test-uuid-123',
        originalLine: 1,
        date: '2025-01-01',
        operation: 'Payment',
        details: 'Test details',
        account: 'Main Account',
        accountingStatus: 'PENDING',
        currency: 'EUR',
        amount: '100.00',
      },
    });

    expect(created.id).toBeDefined();

    const count = await prismaService.rawTransaction.count();
    expect(count).toBe(1);
  });
});
