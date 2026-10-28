import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,

    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,

    private readonly dataSource: DataSource,
  ) {}

  async enroll(studentId: string, courseId: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        // Lock the course during enrollment.
        const course = await manager.getRepository(Course).findOne({
          where: {
            id: courseId,
            isPublished: true,
          },
          lock: { mode: 'pessimistic_write' },
        });

        if (!course) {
          throw new NotFoundException('Course not found or unpublished');
        }

        const enrollmentRepo = manager.getRepository(Enrollment);

        // Check for an existing enrollment.
        const existingEnrollment = await enrollmentRepo.findOne({
          where: { studentId, courseId },
        });

        if (existingEnrollment) {
          return {
            enrollment: existingEnrollment,
            created: false,
          };
        }

        // Create a new enrollment.
        const enrollment = enrollmentRepo.create({
          studentId,
          courseId,
          status: EnrollmentStatus.NOT_STARTED,
          completionPercentage: 0,
          lessonsCompleted: 0,
        });

        const savedEnrollment = await enrollmentRepo.save(enrollment);

        return {
          enrollment: savedEnrollment,
          created: true,
        };
      });
    } catch (error) {
      // Handle duplicate enrollment requests.
      if (isUniqueViolation(error)) {
        const existing = await this.enrollmentsRepository.findOne({
          where: { studentId, courseId },
        });

        if (existing) {
          return {
            enrollment: existing,
            created: false,
          };
        }
      }

      throw error;
    }
  }
}
