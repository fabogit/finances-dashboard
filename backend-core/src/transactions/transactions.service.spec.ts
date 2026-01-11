import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { ScienceService } from '../science/science.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('TransactionsService', () => {
  let service: TransactionsService;
  let repository: TransactionsRepository;

  const mockRepository = {
    createManyRaw: jest.fn(),
    findAllRaw: jest.fn(),
  };

  const mockScienceService = {
    processTransactions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: mockRepository,
        },
        {
          provide: ScienceService,
          useValue: mockScienceService,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    repository = module.get<TransactionsRepository>(TransactionsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllTransactions', () => {
    it('should call repository.findAllRaw with correct pagination parameters', async () => {
      const paginationQuery: PaginationQueryDto = { page: 2, limit: 10 };
      const expectedSkip = 10;
      const expectedTake = 10;

      await service.getAllTransactions(paginationQuery);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findAllRaw).toHaveBeenCalledWith(
        expectedSkip,
        expectedTake,
      );
    });

    it('should call repository.findAllRaw without pagination parameters when not provided', async () => {
      const paginationQuery: PaginationQueryDto = {};

      await service.getAllTransactions(paginationQuery);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findAllRaw).toHaveBeenCalledWith();
    });

    it('should default page to 1 if only limit is provided', async () => {
      const paginationQuery: PaginationQueryDto = { limit: 20 };
      const expectedSkip = 0;
      const expectedTake = 20;

      await service.getAllTransactions(paginationQuery);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(repository.findAllRaw).toHaveBeenCalledWith(
        expectedSkip,
        expectedTake,
      );
    });
  });
});
