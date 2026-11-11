import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { CoursesService } from '../courses/courses.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';

@Injectable()
export class CourseEnrollmentCoordinator {
  constructor(
    private readonly dataSource: DataSource,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async enroll(
    studentId: string,
    courseId: string,
  ): Promise<{ enrollment: Enrollment; created: boolean }> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Share lock the course, so a delete cannot run until this commits.
        await this.coursesService.findPublishedCourseForEnrollment(
          courseId,
          manager,
        );

        // Create an enrollment or return the existing one.
        return this.enrollmentsService.createOrFindEnrollment(
          studentId,
          courseId,
          manager,
        );
      });
    } catch (error) {
      // Two requests from the same student can both pass the check above,
      // so the unique constraint rejects the second and we return the first.
      if (isUniqueViolation(error)) {
        const existing = await this.enrollmentsService.findExistingEnrollment(
          studentId,
          courseId,
        );

        if (existing) {
          return { enrollment: existing, created: false };
        }
      }

      throw error;
    }
  }
}
