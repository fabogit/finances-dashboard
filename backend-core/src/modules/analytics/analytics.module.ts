import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from 'src/modules/transactions/transactions.module';
import { ScienceModule } from 'src/modules/science/science.module';
import { AnalyticsRepository } from './analytics.repository';
import { CategoriesModule } from 'src/modules/categories/categories.module';

@Module({
  controllers: [AnalyticsController],
  imports: [PrismaModule, ScienceModule, TransactionsModule, CategoriesModule],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
