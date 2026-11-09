import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesRepository } from './categories.repository.js';

@Module({
  controllers: [CategoriesController],
  exports: [CategoriesRepository],
  providers: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
