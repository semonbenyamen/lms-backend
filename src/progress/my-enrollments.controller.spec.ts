import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseProgressService } from './course-progress.service.js';
import { MyEnrollmentsController } from './my-enrollments.controller.js';

describe('MyEnrollmentsController', () => {
  let controller: MyEnrollmentsController;

  const courseProgressService = {
    findMyEnrollments: vi.fn(),
  };

  const request = {
    user: {
      sub: 'student-123',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    },
  } as AuthenticatedRequest;

  const page = {
    items: [],
    meta: {
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new MyEnrollmentsController(
      courseProgressService as unknown as CourseProgressService,
    );
  });

  it('should list the courses of the signed in student', async () => {
    courseProgressService.findMyEnrollments.mockResolvedValue(page);

    await expect(
      controller.findMyEnrollments({ page: 1, limit: 10 }, request),
    ).resolves.toBe(page);
    expect(courseProgressService.findMyEnrollments).toHaveBeenCalledWith(
      'student-123',
      { page: 1, limit: 10 },
    );
  });

  it('should propagate errors', async () => {
    courseProgressService.findMyEnrollments.mockRejectedValue(
      new Error('Failed'),
    );

    await expect(controller.findMyEnrollments({}, request)).rejects.toThrow(
      'Failed',
    );
  });
});
