import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { ScienceModule } from '../science/science.module.js';
import { AnalyticsRepository } from './analytics.repository.js';
import { CategoriesModule } from '../categories/categories.module.js';

@Module({
  controllers: [AnalyticsController],
  imports: [PrismaModule, ScienceModule, TransactionsModule, CategoriesModule],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
