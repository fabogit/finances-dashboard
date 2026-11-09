import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AssetsModule } from './modules/assets/assets.module.js';
import { CategoriesModule } from './modules/categories/categories.module.js';
import { GoalsModule } from './modules/goals/goals.module.js';
import { ScienceModule } from './modules/science/science.module.js';
import { TransactionsModule } from './modules/transactions/transactions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? undefined : '.env.local',
      validate,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(import.meta.dirname, 'public'),
      exclude: ['/api/{*path}'],
    }),
    TransactionsModule,
    PrismaModule,
    ScienceModule,
    AnalyticsModule,
    CategoriesModule,
    AssetsModule,
    GoalsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
