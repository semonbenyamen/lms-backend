import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseEnrollmentController } from './course-enrollment.controller.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

describe('CourseEnrollmentController', () => {
  let controller: CourseEnrollmentController;

  const coordinator = {
    enroll: vi.fn(),
    cancel: vi.fn(),
  };

  const request = {
    user: {
      sub: 'student-123',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    },
  } as AuthenticatedRequest;

  const response = {
    status: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const enrolledAt = new Date('2026-11-01T10:00:00.000Z');

  const enrollment = {
    id: 'enrollment-123',
    studentId: 'student-123',
    courseId: 'course-123',
    status: EnrollmentStatus.NOT_STARTED,
    completionPercentage: 0,
    lessonsCompleted: 0,
    lastActivityAt: null,
    completedAt: null,
    cancelledAt: null,
    enrolledAt,
    updatedAt: enrolledAt,
  };

  // The response hides studentId, cancelledAt and updatedAt.
  const enrollmentResponse = {
    id: 'enrollment-123',
    courseId: 'course-123',
    status: EnrollmentStatus.NOT_STARTED,
    completionPercentage: 0,
    lessonsCompleted: 0,
    lastActivityAt: null,
    completedAt: null,
    enrolledAt,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new CourseEnrollmentController(
      coordinator as unknown as CourseEnrollmentCoordinator,
    );
  });

  it('should enroll a student in a course', async () => {
    coordinator.enroll.mockResolvedValue({
      enrollment,
      created: true,
    });

    const result = await controller.enroll('course-123', request, response);

    expect(coordinator.enroll).toHaveBeenCalledWith(
      request.user.sub,
      'course-123',
    );
    expect(response.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    expect(result).toEqual(enrollmentResponse);
  });

  it('should return 200 for an existing enrollment', async () => {
    coordinator.enroll.mockResolvedValue({
      enrollment,
      created: false,
    });

    const result = await controller.enroll('course-123', request, response);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(result).toEqual(enrollmentResponse);
  });

  it('should cancel the enrollment of the signed in student', async () => {
    coordinator.cancel.mockResolvedValue(undefined);

    await expect(
      controller.cancel('course-123', request),
    ).resolves.toBeUndefined();
    expect(coordinator.cancel).toHaveBeenCalledWith(
      request.user.sub,
      'course-123',
    );
  });

  it('should propagate enrollment errors', async () => {
    coordinator.enroll.mockRejectedValue(new Error('Enrollment failed'));

    await expect(
      controller.enroll('course-123', request, response),
    ).rejects.toThrow('Enrollment failed');
  });
});
