import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosResponse, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { of } from 'rxjs';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { ScienceService } from './science.service';
import { SCIENCE_RETRY_BASE_DELAY_MS } from './science.constants';
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

const forecastInput: ForecastTransactionInputDto[] = [
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

const goalRequest = {
  transactions: [],
  target_amount: 1000,
  current_amount: 500,
};

const rawTransactions: RawTransaction[] = [
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

const mockForecast: MonthlyForecastDto[] = [
  {
    date: '2026-02',
    balance: 500.5,
    income: { total: 1000, fixed: 1000, variable: 0 },
    expense: { total: 500, fixed: 200, variable: 300 },
  },
];

describe('ScienceService', () => {
  describe('with a mocked HttpService (success paths)', () => {
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

    it('getForecast should return forecast data on SUCCESS', async () => {
      httpService.post.mockReturnValue(of(createAxiosResponse(mockForecast)));

      const result = await service.getForecast(forecastInput);

      expect(result).toEqual(mockForecast);
      expect(httpService.post.mock.calls[0][0]).toBe(
        'http://mock-science:8000/forecast',
      );
    });

    it('getForecast should pass through the "insufficient data" payload of Python', async () => {
      const insufficient = { error: 'Not enough data in the selected period' };
      httpService.post.mockReturnValue(of(createAxiosResponse(insufficient)));

      const result = await service.getForecast(forecastInput);

      expect(result).toEqual(insufficient);
    });

    it('getGoalProjection should return goal projection on SUCCESS', async () => {
      const mockResponse = {
        estimated_date: '2025-12',
        monthly_avg: 100,
        confidence: 'HIGH',
      };

      httpService.post.mockReturnValue(of(createAxiosResponse(mockResponse)));

      const result = await service.getGoalProjection(goalRequest);

      expect(result).toEqual(mockResponse);
      expect(httpService.post.mock.calls[0][0]).toContain('/goals/projection');
      expect(httpService.post.mock.calls[0][1]).toEqual(goalRequest);
    });

    it('processTransactions should return processed transactions on SUCCESS', async () => {
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

      const result = await service.processTransactions(rawTransactions);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('Food');
    });
  });

  /**
   * Resilience tests run the real HttpService (axios) against a local stub
   * HTTP server, so timeouts, connection errors and status codes behave as
   * they would against backend-science, without needing Python running.
   */
  describe('resilience against a stub HTTP server', () => {
    const TEST_TIMEOUT_MS = 200;
    /** Slack allowed above the timeout for scheduling and error mapping. */
    const TIMEOUT_MARGIN_MS = 150;

    type Handler = (req: IncomingMessage, res: ServerResponse) => void;

    let server: Server | undefined;
    let requestTimes: number[];

    const reply =
      (status: number, body: unknown): Handler =>
      (_req, res) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };

    /** Answers with the given handlers in order; the last one repeats. */
    const startStub = async (...handlers: Handler[]): Promise<string> => {
      requestTimes = [];
      const stub = createServer((req, res) => {
        const handler =
          handlers[Math.min(requestTimes.length, handlers.length - 1)];
        requestTimes.push(Date.now());
        // Drain the body before answering, as a real server would
        req.resume();
        req.on('end', () => handler(req, res));
      });
      server = stub;
      await new Promise<void>((resolve) =>
        stub.listen(0, '127.0.0.1', resolve),
      );
      return `http://127.0.0.1:${(stub.address() as AddressInfo).port}`;
    };

    /** A URL whose port refuses connections, like a stopped container. */
    const closedPortUrl = async (): Promise<string> => {
      const probe = createServer();
      await new Promise<void>((resolve) =>
        probe.listen(0, '127.0.0.1', resolve),
      );
      const { port } = probe.address() as AddressInfo;
      await new Promise<void>((resolve) => probe.close(() => resolve()));
      return `http://127.0.0.1:${port}`;
    };

    const buildService = async (
      url: string,
      overrides: Record<string, unknown> = {},
    ): Promise<ScienceService> => {
      const config: Record<string, unknown> = {
        SCIENCE_SERVICE_URL: url,
        SCIENCE_TIMEOUT_MS: TEST_TIMEOUT_MS,
        SCIENCE_RETRY_COUNT: 2,
        ...overrides,
      };
      const module = await Test.createTestingModule({
        imports: [HttpModule],
        providers: [
          ScienceService,
          {
            provide: ConfigService,
            useValue: { get: (key: string) => config[key] },
          },
        ],
      }).compile();
      return module.get(ScienceService);
    };

    const captureError = async (
      promise: Promise<unknown>,
    ): Promise<HttpException> => {
      try {
        await promise;
      } catch (error) {
        return error as HttpException;
      }
      throw new Error('Expected the call to fail');
    };

    afterEach(async () => {
      const stub = server;
      server = undefined;
      if (stub) {
        stub.closeAllConnections();
        await new Promise<void>((resolve) => stub.close(() => resolve()));
      }
    });

    describe('timeout', () => {
      it('should fail with 504 within the timeout plus a small margin, without retrying', async () => {
        const url = await startStub(() => {
          /* never answers */
        });
        const service = await buildService(url);

        const started = Date.now();
        const error = await captureError(service.getForecast(forecastInput));
        const elapsed = Date.now() - started;

        expect(error).toBeInstanceOf(GatewayTimeoutException);
        expect(error.getStatus()).toBe(504);
        expect(error.getResponse()).toMatchObject({ error: 'SCIENCE_TIMEOUT' });
        expect(elapsed).toBeGreaterThanOrEqual(TEST_TIMEOUT_MS);
        expect(elapsed).toBeLessThan(TEST_TIMEOUT_MS + TIMEOUT_MARGIN_MS);
        expect(requestTimes).toHaveLength(1);
      });

      it('should read the timeout from SCIENCE_TIMEOUT_MS', async () => {
        const url = await startStub((req, res) => {
          setTimeout(() => reply(200, mockForecast)(req, res), 300);
        });
        const service = await buildService(url, { SCIENCE_TIMEOUT_MS: 1000 });

        await expect(service.getForecast(forecastInput)).resolves.toEqual(
          mockForecast,
        );
      });
    });

    describe('retry', () => {
      it('should return the result after one retry when a 503 is followed by a success', async () => {
        const url = await startStub(
          reply(503, { detail: 'warming up' }),
          reply(200, mockForecast),
        );
        const service = await buildService(url);

        await expect(service.getForecast(forecastInput)).resolves.toEqual(
          mockForecast,
        );
        expect(requestTimes).toHaveLength(2);
      });

      it.each([502, 504])(
        'should retry a transient %i response',
        async (status) => {
          const url = await startStub(
            reply(status, {}),
            reply(200, mockForecast),
          );
          const service = await buildService(url);

          await expect(service.getForecast(forecastInput)).resolves.toEqual(
            mockForecast,
          );
          expect(requestTimes).toHaveLength(2);
        },
      );

      it('should retry after a network error (connection reset)', async () => {
        const url = await startStub(
          (req) => req.socket.destroy(),
          reply(200, mockForecast),
        );
        const service = await buildService(url);

        await expect(service.getForecast(forecastInput)).resolves.toEqual(
          mockForecast,
        );
        expect(requestTimes).toHaveLength(2);
      });

      it('should wait with backoff between attempts', async () => {
        const url = await startStub(reply(503, {}), reply(200, mockForecast));
        const service = await buildService(url);

        await service.getForecast(forecastInput);

        expect(requestTimes[1] - requestTimes[0]).toBeGreaterThanOrEqual(
          SCIENCE_RETRY_BASE_DELAY_MS,
        );
      });

      it('should not retry a 4xx and answer 502 with the upstream detail', async () => {
        const url = await startStub(
          reply(422, { detail: [{ loc: ['body'], msg: 'field required' }] }),
        );
        const service = await buildService(url);

        const error = await captureError(service.getForecast(forecastInput));

        expect(error).toBeInstanceOf(BadGatewayException);
        expect(error.getStatus()).toBe(502);
        expect(error.getResponse()).toMatchObject({
          error: 'SCIENCE_BAD_RESPONSE',
        });
        expect(error.message).toContain('HTTP 422');
        expect(error.message).toContain('field required');
        expect(requestTimes).toHaveLength(1);
      });

      it('should not retry a 500', async () => {
        const url = await startStub(
          reply(500, { detail: 'Python script crashed' }),
        );
        const service = await buildService(url);

        const error = await captureError(
          service.processTransactions(rawTransactions),
        );

        expect(error).toBeInstanceOf(BadGatewayException);
        expect(error.message).toContain('HTTP 500: "Python script crashed"');
        expect(requestTimes).toHaveLength(1);
      });

      it('should stop after SCIENCE_RETRY_COUNT retries and answer 502', async () => {
        const url = await startStub(reply(503, {}));
        const service = await buildService(url, { SCIENCE_RETRY_COUNT: 1 });

        const error = await captureError(service.getForecast(forecastInput));

        expect(error).toBeInstanceOf(BadGatewayException);
        expect(error.message).toContain('HTTP 503');
        expect(requestTimes).toHaveLength(2);
      });
    });

    describe('science service down', () => {
      it('getForecast should fail with 503, never resolve with an error object', async () => {
        const service = await buildService(await closedPortUrl());

        const error = await captureError(service.getForecast(forecastInput));

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.getStatus()).toBe(503);
        expect(error.getResponse()).toMatchObject({
          error: 'SCIENCE_UNAVAILABLE',
        });
        expect(error.message).toBe(
          'Science service unreachable on /forecast: ECONNREFUSED',
        );
      });

      it('getGoalProjection should fail with 503, never resolve with an error object', async () => {
        const service = await buildService(await closedPortUrl());

        const error = await captureError(
          service.getGoalProjection(goalRequest),
        );

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        expect(error.getStatus()).toBe(503);
      });

      it('processTransactions should fail with 503', async () => {
        const service = await buildService(await closedPortUrl(), {
          SCIENCE_RETRY_COUNT: 0,
        });

        const error = await captureError(
          service.processTransactions(rawTransactions),
        );

        expect(error).toBeInstanceOf(ServiceUnavailableException);
      });
    });
  });
});
