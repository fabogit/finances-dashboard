import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';
import { of, throwError } from 'rxjs';
import { ScienceService } from './science.service';
import { RawTransaction } from '@prisma/client';
import { ForecastTransactionInputDto } from './dto/forecast-transaction-input.dto';
import { MonthlyForecastDto } from './dto/forecast-response.dto';
import { ProcessedTransactionDto } from './dto/processed-transaction.dto';

const createAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {
    headers: new AxiosHeaders(),
  } as InternalAxiosRequestConfig,
});

const createAxiosError = (
  status: number,
  message: string,
  detail?: unknown,
): AxiosError => {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  const response = {
    data: detail ? { detail } : {},
    status,
    statusText: 'Error',
    headers: {},
    config,
  } as AxiosResponse;

  return new AxiosError(message, String(status), config, undefined, response);
};

describe('ScienceService', () => {
  let service: ScienceService;
  let httpService: jest.Mocked<HttpService>;

  beforeEach(async () => {
    const mockHttpService = {
      post: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SCIENCE_SERVICE_URL') return 'http://mock-science:8000';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScienceService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ScienceService>(ScienceService);
    httpService = module.get(HttpService);
  });

  describe('getForecast', () => {
    const mockInput: ForecastTransactionInputDto[] = [
      {
        id: 'tx_1',
        date: '2025-01-01',
        amount: -50,
        category: 'Food',
        subCategory: null,
        account: 'Main',
        details: 'Pizza',
        operation: 'Payment',
      },
    ];

    it('Should return forecast data on SUCCESS', async () => {
      const mockForecast: MonthlyForecastDto[] = [
        {
          date: '2026-02',
          balance: 500.5,
          income: { total: 1000, fixed: 1000, variable: 0 },
          expense: { total: 500, fixed: 200, variable: 300 },
        },
      ];

      httpService.post.mockReturnValue(of(createAxiosResponse(mockForecast)));

      const result = await service.getForecast(mockInput);

      if ('error' in result) {
        throw new Error('Should not return error object');
      }

      expect(result).toEqual(mockForecast);
      expect(Array.isArray(result)).toBe(true);
    });

    it('Should HANDLE errors gracefully when Service is DOWN', async () => {
      const error = createAxiosError(
        503,
        'Service Unavailable',
        'Connection refused',
      );
      httpService.post.mockReturnValue(throwError(() => error));

      const result = await service.getForecast(mockInput);

      if (!('error' in result)) {
        throw new Error('Should return error object');
      }

      expect(result.error).toContain('Science Service Unavailable');
      expect(result.error).toContain('503');
    });

    it('Should capture FastAPI details if provided', async () => {
      const validationDetail = [
        { loc: ['body', 'amount'], msg: 'field required' },
      ];
      const error = createAxiosError(
        422,
        'Unprocessable Entity',
        validationDetail,
      );

      httpService.post.mockReturnValue(throwError(() => error));

      const result = await service.getForecast(mockInput);

      if (!('error' in result)) {
        throw new Error('Should return error object');
      }

      expect(result.error).toContain('422');
      expect(result.error).toContain('field required');
    });
  });

  describe('getGoalProjection', () => {
    const mockRequest = {
      transactions: [],
      target_amount: 1000,
      current_amount: 500,
    };

    it('Should return goal projection on SUCCESS', async () => {
      const mockResponse = {
        estimated_date: '2025-12',
        monthly_avg: 100,
        confidence: 'HIGH',
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockResponse)));

      const result = await service.getGoalProjection(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(httpService.post.mock.calls[0][0]).toContain('/goals/projection');
      expect(httpService.post.mock.calls[0][1]).toEqual(mockRequest);
    });

    it('Should fall back to error object on failure', async () => {
      const error = createAxiosError(422, 'Unprocessable', 'Invalid data');
      httpService.post.mockReturnValue(throwError(() => error));

      const result = await service.getGoalProjection(mockRequest);

      expect(result).toHaveProperty('error');
    });
  });

  describe('processTransactions', () => {
    const mockRawTx: RawTransaction[] = [
      {
        id: 'raw_1',
        importBatchId: 'batch_1',
        originalLine: 1,
        date: '2025-01-01',
        amount: '-20.50',
        details: 'Test Raw',
        operation: null,
        account: null,
        currency: 'EUR',
        category: null,
        accountingStatus: 'PENDING',
        createdAt: new Date(),
      },
    ];

    it('Should return processed transactions on SUCCESS', async () => {
      const mockProcessed: ProcessedTransactionDto[] = [
        {
          id: 'processed_1',
          date: '2025-01-01',
          amount: -20,
          category: 'Food',
          subCategory: 'Groceries',
          account: 'Bank',
          details: 'Coop',
          operation: 'POS',
        },
      ];

      httpService.post.mockReturnValue(of(createAxiosResponse(mockProcessed)));

      const result = await service.processTransactions(mockRawTx);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
    });

    it('Should THROW Error when Service fails', async () => {
      const error = createAxiosError(
        500,
        'Internal Server Error',
        'Python script crashed',
      );

      httpService.post.mockReturnValue(throwError(() => error));

      await expect(service.processTransactions(mockRawTx)).rejects.toThrow(
        'HTTP 500: "Python script crashed"',
      );
    });
  });
});
