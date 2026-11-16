import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CategoriesModule } from '../categories/categories.module.js';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { CourseCatalogController } from './course-catalog.controller.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';
import { CourseOwnershipGuard } from './guards/course-ownership.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course]),
    AuthModule,
    CategoriesModule,
    CloudinaryModule,
    EnrollmentsModule,
  ],
  controllers: [CoursesController, CourseCatalogController],
  providers: [CoursesService, CourseOwnershipGuard],
  exports: [CoursesService, CourseOwnershipGuard],
})
export class CoursesModule {}
