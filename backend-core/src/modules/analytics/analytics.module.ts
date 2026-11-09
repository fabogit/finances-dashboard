import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ScienceModule } from '../science/science.module';
import { AnalyticsRepository } from './analytics.repository';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  controllers: [AnalyticsController],
  imports: [PrismaModule, ScienceModule, TransactionsModule, CategoriesModule],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
