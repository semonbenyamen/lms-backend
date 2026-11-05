import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Course } from '../courses/entities/course.entity.js';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';
import { IsCategoryNameAvailableConstraint } from './validators/is-category-name-available.validator.js';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Course]), AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, IsCategoryNameAvailableConstraint],
  exports: [CategoriesService],
})
export class CategoriesModule {}
