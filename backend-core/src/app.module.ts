import { Module } from '@nestjs/common';
import { TransactionsModule } from './transactions/transactions.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TransactionsModule,
    PrismaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
