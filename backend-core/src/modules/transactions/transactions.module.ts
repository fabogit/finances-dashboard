import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AssetsModule } from '../assets/assets.module';
import { GoalsModule } from '../goals/goals.module';
import { ScienceModule } from '../science/science.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';

@Module({
  controllers: [TransactionsController],
  exports: [TransactionsRepository],
  imports: [AssetsModule, GoalsModule, PrismaModule, ScienceModule],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}
