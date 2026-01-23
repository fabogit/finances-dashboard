import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { ScienceModule } from 'src/science/science.module';
import { AnalyticsRepository } from './analytics.repository';

@Module({
  controllers: [AnalyticsController],
  imports: [PrismaModule, ScienceModule, TransactionsModule],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
