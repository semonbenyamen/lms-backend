import { describe, expect, it } from 'vitest';

import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';
import type { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { toMyEnrollmentResponseDto } from './my-enrollment-response.transformer.js';

describe('toMyEnrollmentResponseDto', () => {
  it('should return the live progress and only the public course fields', () => {
    const enrolledAt = new Date('2026-11-01T10:00:00.000Z');
    const enrollment = {
      id: 'enrollment-1',
      studentId: 'student-1',
      courseId: 'course-1',
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
      lastActivityAt: null,
      completedAt: null,
      cancelledAt: null,
      enrolledAt,
      course: {
        id: 'course-1',
        title: 'NestJS',
        thumbnailUrl: null,
        thumbnailPublicId: null,
        isPublished: true,
        instructorId: 'instructor-1',
      },
    } as unknown as Enrollment;

    expect(
      toMyEnrollmentResponseDto(enrollment, {
        status: EnrollmentStatus.IN_PROGRESS,
        completionPercentage: 50,
      }),
    ).toEqual({
      id: 'enrollment-1',
      status: EnrollmentStatus.IN_PROGRESS,
      completionPercentage: 50,
      lastActivityAt: null,
      enrolledAt,
      course: {
        id: 'course-1',
        title: 'NestJS',
        thumbnailUrl: null,
        isPublished: true,
      },
    });
  });
});
