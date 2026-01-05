import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { ScienceService } from './science.service';
import { of, throwError } from 'rxjs';
import { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import { RawTransaction } from '@prisma/client';
import { ProcessedTransaction } from './interfaces/processed-transaction.interface';

describe('ScienceService', () => {
  let service: ScienceService;
  let httpService: HttpService;

  // Mock data objects
  const mockRawTransactions: RawTransaction[] = [
    {
      id: '1',
      date: '46020',
      operation: 'Payment',
      details: 'Test Details',
      account: 'Account A',
      amount: '-100',
      category: null,
      originalLine: 1,
    } as unknown as RawTransaction,
  ];

  const mockProcessedTransactions: ProcessedTransaction[] = [
    {
      id: '1',
      date: '2025-12-29',
      operation: 'Payment',
      details: 'Test Details',
      account: 'Account A',
      amount: -100.0,
      category: 'Uncategorized',
    },
  ];

  const mockAxiosResponse: AxiosResponse<ProcessedTransaction[]> = {
    data: mockProcessedTransactions,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {
      headers: new AxiosHeaders(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScienceService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://test-url'),
          },
        },
      ],
    }).compile();

    service = module.get<ScienceService>(ScienceService);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTransactions', () => {
    it('should successfully send transactions and return processed data', async () => {
      // Arrange
      const postSpy = jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of(mockAxiosResponse));

      // Act
      const result = await service.processTransactions(mockRawTransactions);

      // Assert
      expect(postSpy).toHaveBeenCalledWith(
        'http://test-url/process',
        mockRawTransactions,
      );
      expect(result).toEqual(mockProcessedTransactions);
    });

    it('should handle and throw formatted error when Axios request fails', async () => {
      // Arrange
      const errorResponse = {
        message: 'Internal Server Error',
        response: { status: 500 },
      };

      const postSpy = jest
        .spyOn(httpService, 'post')
        .mockReturnValue(
          throwError(
            () =>
              new AxiosError(
                errorResponse.message,
                '500',
                undefined,
                undefined,
                { status: 500 } as unknown as AxiosResponse,
              ),
          ),
        );

      // Act & Assert
      await expect(
        service.processTransactions(mockRawTransactions),
      ).rejects.toThrow('Internal Server Error (Status: 500)');

      expect(postSpy).toHaveBeenCalled();
    });

    it('should handle generic errors unrelated to Axios', async () => {
      // Arrange
      const genericError = new Error('Network unreachable');
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(throwError(() => genericError));

      // Act & Assert
      await expect(
        service.processTransactions(mockRawTransactions),
      ).rejects.toThrow('Network unreachable');
    });
  });
});
