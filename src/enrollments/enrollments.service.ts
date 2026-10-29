
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { Enrollment } from './entities/enrollment.entity.js';

@Injectable()
export class EnrollmentsService {
  constructor(
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
  ) {}

  // Check if a course has active enrollments.
  async hasActiveEnrollments(
    courseId: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const count = await manager.getRepository(Enrollment).count({
      where: {
        courseId,
        cancelledAt: IsNull(),
      },
    });

    return count > 0;
  }

  // Create an enrollment or return the existing one.
  async createOrFindEnrollment(
    studentId: string,
    courseId: string,
    manager: EntityManager,
  ): Promise<{ enrollment: Enrollment; created: boolean }> {
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
  }

  // Find an enrollment after a duplicate database error.
  async findExistingEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentsRepository.findOne({
      where: { studentId, courseId },
    });
  }
}
