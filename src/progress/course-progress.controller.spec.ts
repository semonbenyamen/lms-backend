import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseProgressController } from './course-progress.controller.js';
import { CourseProgressService } from './course-progress.service.js';

describe('CourseProgressController', () => {
  let controller: CourseProgressController;

  const courseProgressService = {
    getCourseProgress: vi.fn(),
  };

  const request = {
    user: {
      sub: 'student-123',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    },
  } as AuthenticatedRequest;

  const progressResponse = {
    courseId: 'course-123',
    totalLessons: 2,
    lessonsCompleted: 1,
    totalContents: 4,
    completedContents: 2,
    completionPercentage: 50,
    isCompleted: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new CourseProgressController(
      courseProgressService as unknown as CourseProgressService,
    );
  });

  it('should return the course progress of the signed in student', async () => {
    courseProgressService.getCourseProgress.mockResolvedValue(progressResponse);

    await expect(
      controller.getCourseProgress('course-123', request),
    ).resolves.toEqual(progressResponse);
    expect(courseProgressService.getCourseProgress).toHaveBeenCalledWith(
      'student-123',
      'course-123',
    );
  });

  it('should propagate course progress errors', async () => {
    courseProgressService.getCourseProgress.mockRejectedValue(
      new Error('Not enrolled'),
    );

    await expect(
      controller.getCourseProgress('course-123', request),
    ).rejects.toThrow('Not enrolled');
  });
});
