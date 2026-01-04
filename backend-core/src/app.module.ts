import { Module } from '@nestjs/common';
import { TransactionsModule } from './transactions/transactions.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [TransactionsModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
