import { Module } from '@nestjs/common';
import { AssetsRepository } from './assets.repository.js';
import { AssetsService } from './assets.service.js';
import { AssetsController } from './assets.controller.js';

@Module({
  controllers: [AssetsController],
  exports: [AssetsService, AssetsRepository],
  providers: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
