import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AssetsModule } from '../assets/assets.module.js';
import { GoalsModule } from '../goals/goals.module.js';
import { ScienceModule } from '../science/science.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';
import { TransactionsRepository } from './transactions.repository.js';

@Module({
  controllers: [TransactionsController],
  exports: [TransactionsRepository],
  imports: [AssetsModule, GoalsModule, PrismaModule, ScienceModule],
  providers: [TransactionsService, TransactionsRepository],
})
export class TransactionsModule {}
