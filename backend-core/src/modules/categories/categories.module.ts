import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';

@Module({
  controllers: [CategoriesController],
  exports: [CategoriesRepository],
  providers: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
