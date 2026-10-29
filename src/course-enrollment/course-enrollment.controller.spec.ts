import { HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseEnrollmentController } from './course-enrollment.controller.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

describe('CourseEnrollmentController', () => {
  let controller: CourseEnrollmentController;

  const coordinator = {
    enroll: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new CourseEnrollmentController(
      coordinator as unknown as CourseEnrollmentCoordinator,
    );
  });

  it('should enroll a student in a course', async () => {
    const enrollment = {
      id: 'enrollment-123',
      studentId: request.user.sub,
      courseId: 'course-123',
    };

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
    expect(result).toEqual(enrollment);
  });

  it('should return 200 for an existing enrollment', async () => {
    const enrollment = {
      id: 'enrollment-123',
      studentId: request.user.sub,
      courseId: 'course-123',
    };

    coordinator.enroll.mockResolvedValue({
      enrollment,
      created: false,
    });

    const result = await controller.enroll('course-123', request, response);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(result).toEqual(enrollment);
  });

  it('should propagate enrollment errors', async () => {
    coordinator.enroll.mockRejectedValue(new Error('Enrollment failed'));

    await expect(
      controller.enroll('course-123', request, response),
    ).rejects.toThrow('Enrollment failed');
  });
});
