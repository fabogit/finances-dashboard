import { Module } from '@nestjs/common';
import { GoalsRepository } from './goals.repository';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';

@Module({
  controllers: [GoalsController],
  exports: [GoalsService, GoalsRepository],
  providers: [GoalsService, GoalsRepository],
})
export class GoalsModule {}
