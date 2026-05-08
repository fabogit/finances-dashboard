import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AssetsModule } from 'src/modules/assets/assets.module';
import { GoalsModule } from 'src/modules/goals/goals.module';
import { ScienceModule } from 'src/modules/science/science.module';
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
