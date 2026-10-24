
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryFailedError } from 'typeorm';
import type { Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { EnrollmentsService } from './enrollments.service.js';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const studentId = 'student-123';
  const courseId = 'course-123';

  const publishedCourse = {
    id: courseId,
    isPublished: true,
  } as Course;

  const existingEnrollment = {
    id: 'enrollment-123',
    studentId,
    courseId,
    status: EnrollmentStatus.NOT_STARTED,
    completionPercentage: 0,
    lessonsCompleted: 0,
  } as Enrollment;

  const coursesRepository = {
    findOne: vi.fn(),
  };

  const enrollmentsRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new EnrollmentsService(
      enrollmentsRepository as unknown as Repository<Enrollment>,
      coursesRepository as unknown as Repository<Course>,
    );
  });

  it('should enroll a student in a published course', async () => {
    coursesRepository.findOne.mockResolvedValue(publishedCourse);
    enrollmentsRepository.findOne.mockResolvedValue(null);
    enrollmentsRepository.create.mockReturnValue(existingEnrollment);
    enrollmentsRepository.save.mockResolvedValue(existingEnrollment);

    const result = await service.enroll(studentId, courseId);

    expect(result.created).toBe(true);
    expect(result.enrollment).toEqual(existingEnrollment);

    expect(enrollmentsRepository.create).toHaveBeenCalledWith({
      studentId,
      courseId,
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
    });

    expect(enrollmentsRepository.save).toHaveBeenCalledOnce();
  });

  it('should return existing enrollment without creating a duplicate', async () => {
    coursesRepository.findOne.mockResolvedValue(publishedCourse);
    enrollmentsRepository.findOne.mockResolvedValue(existingEnrollment);

    const result = await service.enroll(studentId, courseId);

    expect(result.created).toBe(false);
    expect(result.enrollment).toEqual(existingEnrollment);
    expect(enrollmentsRepository.create).not.toHaveBeenCalled();
    expect(enrollmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should reject enrollment when the course does not exist', async () => {
    coursesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.enroll(studentId, courseId),
    ).rejects.toThrow(NotFoundException);

    expect(enrollmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should only search for published courses', async () => {
    coursesRepository.findOne.mockResolvedValue(null);

    await expect(
      service.enroll(studentId, courseId),
    ).rejects.toThrow(NotFoundException);

    expect(coursesRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: courseId,
        isPublished: true,
      },
    });
  });

  it('should handle duplicate enrollment database errors', async () => {
    coursesRepository.findOne.mockResolvedValue(publishedCourse);

    enrollmentsRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingEnrollment);

    enrollmentsRepository.create.mockReturnValue(existingEnrollment);

    const duplicateError = new QueryFailedError(
      'INSERT INTO enrollments',
      [],
      Object.assign(new Error('Duplicate enrollment'), {
        code: '23505',
       }),
    );

    enrollmentsRepository.save.mockRejectedValue(duplicateError);

    const result = await service.enroll(studentId, courseId);

    expect(result.created).toBe(false);
    expect(result.enrollment).toEqual(existingEnrollment);
  });

  it('should rethrow unexpected database errors', async () => {
    coursesRepository.findOne.mockResolvedValue(publishedCourse);
    enrollmentsRepository.findOne.mockResolvedValue(null);
    enrollmentsRepository.create.mockReturnValue(existingEnrollment);

    const databaseError = new Error('Database unavailable');
    enrollmentsRepository.save.mockRejectedValue(databaseError);

    await expect(
      service.enroll(studentId, courseId),
    ).rejects.toThrow('Database unavailable');
  });
});
