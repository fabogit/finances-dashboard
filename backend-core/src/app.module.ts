import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { validate } from './common/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssetsModule } from './modules/assets/assets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { GoalsModule } from './modules/goals/goals.module';
import { ScienceModule } from './modules/science/science.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? undefined : '.env.local',
      validate,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/(.*)'],
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
