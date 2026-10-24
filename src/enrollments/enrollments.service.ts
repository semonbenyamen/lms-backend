
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,

    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async enroll(studentId: string, courseId: string) {
    // Step 1: Check that the course exists and is published.
    const course = await this.coursesRepository.findOne({
      where: {
        id: courseId,
        isPublished: true,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or unpublished',
      );
    }

    // Step 2: Check whether the student is already enrolled.
    const existingEnrollment =
      await this.enrollmentsRepository.findOne({
        where: {
          studentId,
          courseId,
        },
      });

    if (existingEnrollment) {
      return {
        enrollment: existingEnrollment,
        created: false,
      };
    }

    // Step 3: Prepare a new enrollment.
    const enrollment = this.enrollmentsRepository.create({
      studentId,
      courseId,
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
    });

    // Step 4: Save the enrollment.
    try {
      const savedEnrollment =
        await this.enrollmentsRepository.save(enrollment);

      return {
        enrollment: savedEnrollment,
        created: true,
      };
    } catch (error) {
      // Handle two simultaneous enrollment requests.
      if (isUniqueViolation(error)) {
        const existing =
          await this.enrollmentsRepository.findOne({
            where: {
              studentId,
              courseId,
            },
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
