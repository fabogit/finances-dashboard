import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from 'src/transactions/transactions.module';

@Module({
  controllers: [AnalyticsController],
  imports: [PrismaModule, TransactionsModule],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
