import { Module } from '@nestjs/common';
import { GoalsRepository } from './goals.repository.js';
import { GoalsService } from './goals.service.js';
import { GoalsController } from './goals.controller.js';
import { ScienceModule } from '../science/science.module.js';

@Module({
  imports: [ScienceModule],
  controllers: [GoalsController],
  exports: [GoalsService, GoalsRepository],
  providers: [GoalsService, GoalsRepository],
})
export class GoalsModule {}
