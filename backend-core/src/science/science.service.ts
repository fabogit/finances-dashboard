import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RawTransaction } from '@prisma/client';
import { isAxiosError } from 'axios';
import { ProcessedTransaction } from './interfaces/processed-transaction.interface';

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
      'http://localhost:8000';
  }

  async processTransactions(
    transactions: RawTransaction[],
  ): Promise<ProcessedTransaction[]> {
    const url = `${this.scienceUrl}/process`;
    this.logger.log(
      `Sending ${transactions.length} transactions to Science Service: ${url}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post<ProcessedTransaction[]>(url, transactions),
      );

      this.logger.log(
        'Processing completed successfully by the Python service',
      );
      return response.data;
    } catch (error: unknown) {
      let errorMessage = 'Unknown error occurred during science processing';

      if (isAxiosError(error)) {
        errorMessage = error.message;
        if (error.response) {
          errorMessage += ` (Status: ${error.response.status})`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.logger.error(`Science Service Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }
}
