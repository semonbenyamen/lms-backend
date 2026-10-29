import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { CoursesService } from '../courses/courses.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

describe('CourseEnrollmentCoordinator', () => {
  const studentId = 'student-123';
  const courseId = 'course-123';
  const course = { id: courseId, isPublished: true };
  const enrollment = { id: 'enrollment-123', studentId, courseId };

  const manager = {} as EntityManager;
  const dataSource = { transaction: vi.fn() };
  const coursesService = {
    findPublishedCourseForEnrollment: vi.fn(),
  };
  const enrollmentsService = {
    createOrFindEnrollment: vi.fn(),
    findExistingEnrollment: vi.fn(),
  };

  let coordinator: CourseEnrollmentCoordinator;

  beforeEach(() => {
    vi.resetAllMocks();

    // Run the transaction callback with the same manager.
    dataSource.transaction.mockImplementation(
      async (callback: (manager: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );

    coordinator = new CourseEnrollmentCoordinator(
      dataSource as unknown as DataSource,
      coursesService as unknown as CoursesService,
      enrollmentsService as unknown as EnrollmentsService,
    );
  });

  it('should create an enrollment for a published course', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    enrollmentsService.createOrFindEnrollment.mockResolvedValue({
      enrollment,
      created: true,
    });

    const result = await coordinator.enroll(studentId, courseId);

    expect(result).toEqual({ enrollment, created: true });
    expect(dataSource.transaction).toHaveBeenCalledOnce();
    expect(
      coursesService.findPublishedCourseForEnrollment,
    ).toHaveBeenCalledWith(courseId, manager);
    expect(enrollmentsService.createOrFindEnrollment).toHaveBeenCalledWith(
      studentId,
      courseId,
      manager,
    );
  });

  it('should return an existing enrollment without creating a new one', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    enrollmentsService.createOrFindEnrollment.mockResolvedValue({
      enrollment,
      created: false,
    });

    const result = await coordinator.enroll(studentId, courseId);

    expect(result).toEqual({ enrollment, created: false });
  });

  it('should reject enrollment when the course is missing or unpublished', async () => {
    coursesService.findPublishedCourseForEnrollment.mockRejectedValue(
      new NotFoundException('Course not found or unpublished'),
    );

    await expect(coordinator.enroll(studentId, courseId)).rejects.toThrow(
      NotFoundException,
    );
    expect(enrollmentsService.createOrFindEnrollment).not.toHaveBeenCalled();
  });

  it('should lock the course before checking for an enrollment', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    enrollmentsService.createOrFindEnrollment.mockResolvedValue({
      enrollment,
      created: true,
    });

    await coordinator.enroll(studentId, courseId);

    expect(
      coursesService.findPublishedCourseForEnrollment.mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      enrollmentsService.createOrFindEnrollment.mock.invocationCallOrder[0],
    );
  });

  it('should return an existing enrollment after a unique constraint error', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    const duplicateError = new QueryFailedError(
      'INSERT INTO enrollments',
      [],
      Object.assign(new Error('Duplicate enrollment'), { code: '23505' }),
    );
    enrollmentsService.createOrFindEnrollment.mockRejectedValue(duplicateError);
    enrollmentsService.findExistingEnrollment.mockResolvedValue(enrollment);

    const result = await coordinator.enroll(studentId, courseId);

    expect(result).toEqual({ enrollment, created: false });
    expect(enrollmentsService.findExistingEnrollment).toHaveBeenCalledWith(
      studentId,
      courseId,
    );
  });

  it('should rethrow a unique constraint error if no enrollment is found', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    const duplicateError = new QueryFailedError(
      'INSERT INTO enrollments',
      [],
      Object.assign(new Error('Duplicate enrollment'), { code: '23505' }),
    );
    enrollmentsService.createOrFindEnrollment.mockRejectedValue(duplicateError);
    enrollmentsService.findExistingEnrollment.mockResolvedValue(null);

    await expect(coordinator.enroll(studentId, courseId)).rejects.toBe(
      duplicateError,
    );
  });

  it('should rethrow unexpected database errors', async () => {
    coursesService.findPublishedCourseForEnrollment.mockResolvedValue(course);
    enrollmentsService.createOrFindEnrollment.mockRejectedValue(
      new Error('Database unavailable'),
    );

    await expect(coordinator.enroll(studentId, courseId)).rejects.toThrow(
      'Database unavailable',
    );
    expect(enrollmentsService.findExistingEnrollment).not.toHaveBeenCalled();
  });
});
