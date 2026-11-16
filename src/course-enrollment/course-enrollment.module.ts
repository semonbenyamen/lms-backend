import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { CourseEnrollmentController } from './course-enrollment.controller.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

@Module({
  imports: [AuthModule, CoursesModule, EnrollmentsModule],
  controllers: [CourseEnrollmentController],
  providers: [CourseEnrollmentCoordinator],
})
export class CourseEnrollmentModule {}
