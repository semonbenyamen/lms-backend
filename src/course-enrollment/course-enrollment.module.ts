
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { CourseEnrollmentController } from './course-enrollment.controller.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Course]),
    CoursesModule,
    EnrollmentsModule,
  ],
  controllers: [CourseEnrollmentController],
  providers: [CourseEnrollmentCoordinator],
})
export class CourseEnrollmentModule {}
