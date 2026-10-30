import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Course]), AuthModule, CategoriesModule],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
