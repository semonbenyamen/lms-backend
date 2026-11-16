import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
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

  // Lock the enrollment until the transaction ends, so the updates of one
  // student run one after another.
  // It returns the locked row, so the caller reads its latest values.
  async lockEnrollment(
    id: string,
    manager: EntityManager,
  ): Promise<Enrollment | null> {
    return manager.findOne(Enrollment, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  // Save the progress totals of an enrollment inside the given transaction.
  async updateProgressSummary(
    id: string,
    summary: Pick<
      Enrollment,
      | 'completionPercentage'
      | 'lessonsCompleted'
      | 'status'
      | 'lastActivityAt'
      | 'completedAt'
    >,
    manager: EntityManager,
  ): Promise<void> {
    await manager.update(Enrollment, { id }, summary);
  }

  // Find the student's active enrollment in a course, with the course,
  // so the caller can check the course is published without another query.
  async findActiveEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentsRepository.findOne({
      where: { studentId, courseId, cancelledAt: IsNull() },
      relations: { course: true },
    });
  }

  // Check if a student is actively enrolled in a course.
  async hasActiveEnrollment(
    studentId: string,
    courseId: string,
  ): Promise<boolean> {
    return this.enrollmentsRepository.exists({
      where: { studentId, courseId, cancelledAt: IsNull() },
    });
  }

  // Find the student's active enrollment in the course that owns the content,
  // with the course. Joins skip soft-deleted rows, so deleted content has no
  // enrollment.
  async findActiveEnrollmentByContent(
    studentId: string,
    contentId: string,
  ): Promise<Enrollment | null> {
    return this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .innerJoinAndSelect('enrollment.course', 'course')
      .innerJoin(
        ContentItem,
        'content',
        'content.courseId = enrollment.courseId',
      )
      .where('enrollment.studentId = :studentId', { studentId })
      .andWhere('content.id = :contentId', { contentId })
      .andWhere('enrollment.cancelledAt IS NULL')
      .getOne();
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
      // A student who cancelled and enrolls again gets the same enrollment
      // back, with the progress made before.
      if (existingEnrollment.cancelledAt) {
        existingEnrollment.cancelledAt = null;

        return {
          enrollment: await enrollmentRepo.save(existingEnrollment),
          created: true,
        };
      }

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

  // Cancel the active enrollment of a student in a course. The progress
  // stays, so it comes back if the student enrolls again.
  async cancelEnrollment(studentId: string, courseId: string): Promise<void> {
    const { affected } = await this.enrollmentsRepository.update(
      { studentId, courseId, cancelledAt: IsNull() },
      { cancelledAt: new Date() },
    );

    if (!affected) {
      throw new NotFoundException('Enrollment not found');
    }
  }

  // A page of the active enrollments of a student with their courses,
  // newest first.
  async findStudentEnrollments(
    studentId: string,
    skip: number,
    take: number,
  ): Promise<[Enrollment[], number]> {
    return this.enrollmentsRepository.findAndCount({
      where: { studentId, cancelledAt: IsNull() },
      relations: { course: true },
      order: { enrolledAt: 'DESC', id: 'ASC' },
      skip,
      take,
    });
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
