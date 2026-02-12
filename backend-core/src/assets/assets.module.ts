import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetsRepository } from './assets.repository';

@Module({
  controllers: [AssetsController],
  exports: [AssetsService],
  providers: [AssetsService, AssetsRepository],
})
export class AssetsModule {}
