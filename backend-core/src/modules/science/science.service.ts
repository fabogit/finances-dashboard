import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';
import { isAxiosError } from 'axios';
import { ProcessedTransactionDto } from './dto/processed-transaction.dto';
import { ForecastTransactionInputDto } from './dto/forecast-transaction-input.dto';
import { MonthlyForecastDto } from '../analytics/dto/forecast-response.dto';
import { ForecastResponse } from './dto/forecast-response.dto';
import { ForecastRequestPayload } from './dto/forecast-request.dto';
import { GoalProjectionRequestDto } from './dto/goal-projection-request.dto';
import { GoalProjectionResponseDto } from './dto/goal-projection-response.dto';

interface FastApiErrorResponse {
  detail?: string; // FastAPI returns { detail: "..." }
}

@Injectable()
export class ScienceService {
  private readonly logger = new Logger(ScienceService.name);
  private readonly scienceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.scienceUrl =
      this.configService.get<string>('SCIENCE_SERVICE_URL') ??
      'http://backend-science:8000';
  }

  /**
   * Send transactions to Python for Forecasting.
   */
  async getForecast(
    transactions: ForecastTransactionInputDto[],
    threshold: number = 0.2,
  ): Promise<ForecastResponse> {
    try {
      const payload: ForecastRequestPayload = {
        transactions: transactions,
        std_deviation_threshold: threshold,
      };

      const response = await firstValueFrom(
        this.httpService.post<MonthlyForecastDto[]>(
          `${this.scienceUrl}/forecast`,
          payload,
        ),
      );

      return response.data;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      this.logger.error(`Error connecting to Forecast Service: ${msg}`);

      return { error: `Science Service Unavailable: ${msg}` };
    }
  }

  /**
   * Get Savings Goal Projection from Python.
   */
  async getGoalProjection(
    payload: GoalProjectionRequestDto,
  ): Promise<GoalProjectionResponseDto> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post<GoalProjectionResponseDto>(
          `${this.scienceUrl}/goals/projection`,
          payload,
        ),
      );
      return data;
    } catch (error) {
      const msg = this.extractErrorMessage(error);
      this.logger.error(`Error connecting to Goal Projection Service: ${msg}`);
      return { error: `Projection Service Unavailable: ${msg}` };
    }
  }

  /**
   * Send Raw Transactions to Python for Cleaning & Enrichment.
   */
  async processTransactions(
    transactions: Prisma.RawTransactionCreateManyInput[],
  ): Promise<ProcessedTransactionDto[]> {
    const url = `${this.scienceUrl}/process`;
    this.logger.log(
      `Sending ${transactions.length} transactions to Science Service: ${url}`,
    );

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<ProcessedTransactionDto[]>(url, transactions),
      );

      this.logger.log(
        'Processing completed successfully by the Python service',
      );
      return data;
    } catch (error: unknown) {
      const msg = this.extractErrorMessage(error);
      this.logger.error(`Science Service Error: ${msg}`);
      throw new Error(msg);
    }
  }

  // --- Helper Error Extraction ---
  private extractErrorMessage(error: unknown): string {
    if (isAxiosError(error)) {
      const status = error.response?.status;

      const responseData = error.response?.data as FastApiErrorResponse;

      const detail = responseData?.detail
        ? JSON.stringify(responseData.detail)
        : error.message;

      return `HTTP ${status}: ${detail}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
