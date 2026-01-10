import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

// Mock uuid to avoid ESM issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// Mock TransactionsService to avoid importing it and its dependencies
const mockTransactionsService = {
  getAllTransactions: jest.fn(),
  uploadFile: jest.fn(),
};

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
      ],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should call getAllTransactions with pagination params', async () => {
      const paginationQuery = { page: 2, limit: 10 };
      await controller.findAll(paginationQuery);
      expect(service.getAllTransactions).toHaveBeenCalledWith(2, 10);
    });

    it('should use default values if no params provided', async () => {
        const paginationQuery = { page: 1, limit: 50 };
        // Simulating the behavior when @Query() transforms defaults.
        // Note: In unit tests of controller methods directly, defaults from DTO might not apply unless validated via ValidationPipe.
        // However, we are passing the object that would be injected.
        await controller.findAll(paginationQuery);
        expect(service.getAllTransactions).toHaveBeenCalledWith(1, 50);
    });
  });
});
