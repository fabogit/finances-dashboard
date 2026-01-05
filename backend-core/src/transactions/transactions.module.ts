import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepository } from './transactions.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ScienceModule } from 'src/science/science.module';

@Module({
  imports: [PrismaModule, ScienceModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}
