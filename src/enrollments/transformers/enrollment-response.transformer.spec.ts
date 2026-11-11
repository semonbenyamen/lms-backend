import { describe, expect, it } from 'vitest';

import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';
import { Enrollment } from '../entities/enrollment.entity.js';
import { toEnrollmentResponseDto } from './enrollment-response.transformer.js';

describe('toEnrollmentResponseDto', () => {
  it('should return only the public enrollment fields', () => {
    const enrolledAt = new Date('2026-11-01T10:00:00.000Z');

    const enrollment = {
      id: 'enrollment-1',
      courseId: 'course-1',
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
      lastActivityAt: null,
      completedAt: null,
      enrolledAt,

      // Internal fields must not be exposed.
      studentId: 'student-1',
      cancelledAt: null,
      updatedAt: enrolledAt,
      student: { id: 'student-1', passwordHash: 'hash' },
    } as unknown as Enrollment;

    expect(toEnrollmentResponseDto(enrollment)).toEqual({
      id: 'enrollment-1',
      courseId: 'course-1',
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
      lastActivityAt: null,
      completedAt: null,
      enrolledAt,
    });
  });
});
