import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  catchError,
  firstValueFrom,
  Observable,
  retry,
  throwError,
  timeout,
  timer,
  TimeoutError,
} from 'rxjs';
import { Prisma } from '@prisma/client';
import { AxiosError, isAxiosError } from 'axios';
import { ProcessedTransactionDto } from './dto/processed-transaction.dto';
import { ForecastTransactionInputDto } from './dto/forecast-transaction-input.dto';
import { ForecastResponse } from './dto/forecast-response.dto';
import { ForecastRequestPayload } from './dto/forecast-request.dto';
import { GoalProjectionRequestDto } from './dto/goal-projection-request.dto';
import { GoalProjectionResponseDto } from './dto/goal-projection-response.dto';
import {
  DEFAULT_SCIENCE_RETRY_COUNT,
  DEFAULT_SCIENCE_TIMEOUT_MS,
  SCIENCE_RETRY_BASE_DELAY_MS,
} from './science.constants';

interface FastApiErrorResponse {
  detail?: string; // FastAPI returns { detail: "..." }
}

/** Upstream statuses that signal a momentary outage, worth retrying. */
const TRANSIENT_STATUSES = new Set([502, 503, 504]);

@Injectable()
export class ScienceService {
  private readonly logger = new Logger(ScienceService.name);
  private readonly scienceUrl: string;
  private readonly timeoutMs: number;
  private readonly retryCount: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.scienceUrl =
      this.configService.get<string>('SCIENCE_SERVICE_URL') ??
      'http://backend-science:8000';
    this.timeoutMs =
      this.configService.get<number>('SCIENCE_TIMEOUT_MS') ??
      DEFAULT_SCIENCE_TIMEOUT_MS;
    this.retryCount =
      this.configService.get<number>('SCIENCE_RETRY_COUNT') ??
      DEFAULT_SCIENCE_RETRY_COUNT;
  }

  /**
   * Send transactions to Python for Forecasting.
   *
   * Resolves with Python's `{ error }` payload when the data is insufficient;
   * rejects with an HttpException (502/503/504) when the call itself fails.
   */
  async getForecast(
    transactions: ForecastTransactionInputDto[],
    threshold: number = 0.2,
  ): Promise<ForecastResponse> {
    const payload: ForecastRequestPayload = {
      transactions: transactions,
      std_deviation_threshold: threshold,
    };

    return this.post<ForecastResponse>('/forecast', payload);
  }

  /**
   * Get Savings Goal Projection from Python.
   *
   * Rejects with an HttpException (502/503/504) when the call fails.
   */
  async getGoalProjection(
    payload: GoalProjectionRequestDto,
  ): Promise<GoalProjectionResponseDto> {
    return this.post<GoalProjectionResponseDto>('/goals/projection', payload);
  }

  /**
   * Send Raw Transactions to Python for Cleaning & Enrichment.
   *
   * Rejects with an HttpException (502/503/504) when the call fails.
   */
  async processTransactions(
    transactions: Prisma.RawTransactionCreateManyInput[],
  ): Promise<ProcessedTransactionDto[]> {
    this.logger.log(
      `Sending ${transactions.length} transactions to Science Service: ${this.scienceUrl}/process`,
    );

    const data = await this.post<ProcessedTransactionDto[]>(
      '/process',
      transactions,
    );

    this.logger.log('Processing completed successfully by the Python service');
    return data;
  }

  /**
   * POST to backend-science with a per-attempt timeout and retries with
   * exponential backoff for transient failures. All science endpoints are
   * stateless computations, so repeating a call is safe.
   * Final failures become HttpExceptions: 504 timeout, 503 unreachable,
   * 502 error response.
   */
  private async post<T>(path: string, body: unknown): Promise<T> {
    const request$: Observable<{ data: T }> = this.httpService
      .post<T>(`${this.scienceUrl}${path}`, body)
      .pipe(
        timeout(this.timeoutMs),
        retry({
          count: this.retryCount,
          delay: (error: unknown, attempt: number) => {
            if (!this.isTransient(error)) {
              return throwError(() => error);
            }
            this.logger.warn(
              `Science call ${path} failed (${this.extractErrorMessage(error)}), retry ${attempt}/${this.retryCount}`,
            );
            return timer(SCIENCE_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          },
        }),
        catchError((error: unknown) =>
          throwError(() => this.toHttpException(path, error)),
        ),
      );

    const { data } = await firstValueFrom(request$);
    return data;
  }

  /** Network errors and 502/503/504 are transient; timeouts and other statuses are not. */
  private isTransient(error: unknown): boolean {
    if (!isAxiosError(error) || this.isTimeout(error)) {
      return false;
    }
    return error.response
      ? TRANSIENT_STATUSES.has(error.response.status)
      : true;
  }

  private isTimeout(error: unknown): boolean {
    return (
      error instanceof TimeoutError ||
      (isAxiosError(error) &&
        (error.code === AxiosError.ECONNABORTED ||
          error.code === AxiosError.ETIMEDOUT))
    );
  }

  private toHttpException(path: string, error: unknown): unknown {
    const detail = this.extractErrorMessage(error);
    this.logger.error(`Science call ${path} failed: ${detail}`);

    if (this.isTimeout(error)) {
      return new GatewayTimeoutException(
        `Science service did not answer ${path} within ${this.timeoutMs} ms`,
        { cause: error, description: 'SCIENCE_TIMEOUT' },
      );
    }

    if (isAxiosError(error) && error.response) {
      return new BadGatewayException(
        `Science service error on ${path}: ${detail}`,
        { cause: error, description: 'SCIENCE_BAD_RESPONSE' },
      );
    }

    if (isAxiosError(error)) {
      return new ServiceUnavailableException(
        `Science service unreachable on ${path}: ${error.code ?? error.message}`,
        { cause: error, description: 'SCIENCE_UNAVAILABLE' },
      );
    }

    return error;
  }

  // --- Helper Error Extraction ---
  private extractErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
      const status = error.response?.status;

      const responseData = error.response?.data as FastApiErrorResponse;

      const detail = responseData?.detail
        ? JSON.stringify(responseData.detail)
        : error.message;

      return status ? `HTTP ${status}: ${detail}` : detail;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
