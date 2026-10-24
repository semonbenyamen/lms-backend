
import { HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { EnrollmentsController } from './enrollments.controller.js';
import type { EnrollmentsService } from './enrollments.service.js';

describe('EnrollmentsController', () => {
  const studentId = 'student-123';
  const courseId = 'course-123';

  const enrollment = {
    id: 'enrollment-123',
    studentId,
    courseId,
    status: EnrollmentStatus.NOT_STARTED,
  };

  const enroll = vi.fn();

  const controller = new EnrollmentsController({
    enroll,
  } as unknown as EnrollmentsService);

  const request = {
    user: {
      sub: studentId,
      email: 'student@example.com',
      role: UserRole.STUDENT,
    },
  } as AuthenticatedRequest;

  it('should create an enrollment and return 201', async () => {
    enroll.mockReset();
    enroll.mockResolvedValue({
      enrollment,
      created: true,
    });

    const response = {
      status: vi.fn(),
    } as unknown as Response;

    const result = await controller.enroll(
      courseId,
      request,
      response,
    );

    expect(enroll).toHaveBeenCalledWith(studentId, courseId);
    expect(response.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    expect(result).toEqual(enrollment);
  });

  it('should return 200 when already enrolled', async () => {
    enroll.mockReset();
    enroll.mockResolvedValue({
      enrollment,
      created: false,
    });

    const response = {
      status: vi.fn(),
    } as unknown as Response;

    const result = await controller.enroll(
      courseId,
      request,
      response,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(result).toEqual(enrollment);
  });
});
