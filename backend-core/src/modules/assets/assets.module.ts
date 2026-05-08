import { Module } from '@nestjs/common';
import { AssetsRepository } from './assets.repository';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  controllers: [AssetsController],
  exports: [AssetsService, AssetsRepository],
  providers: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
