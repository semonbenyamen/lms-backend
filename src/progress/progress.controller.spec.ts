import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

describe('ProgressController', () => {
  let controller: ProgressController;

  const progressService = {
    getProgress: vi.fn(),
    updateStudentContentProgress: vi.fn(),
  };

  const request = {
    user: {
      sub: 'student-123',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    },
  } as AuthenticatedRequest;

  const progressResponse = {
    contentItemId: 'content-123',
    isCompleted: false,
    lastPositionSeconds: 30,
    completedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new ProgressController(
      progressService as unknown as ProgressService,
    );
  });

  it('should return the progress of the signed in student', async () => {
    progressService.getProgress.mockResolvedValue(progressResponse);

    await expect(
      controller.getProgress('content-123', request),
    ).resolves.toEqual(progressResponse);
    expect(progressService.getProgress).toHaveBeenCalledWith(
      'student-123',
      'content-123',
    );
  });

  it('should update the progress of the signed in student', async () => {
    const dto = { lastPositionSeconds: 30 };
    progressService.updateStudentContentProgress.mockResolvedValue(
      progressResponse,
    );

    await expect(
      controller.updateStudentContentProgress('content-123', dto, request),
    ).resolves.toEqual(progressResponse);
    expect(progressService.updateStudentContentProgress).toHaveBeenCalledWith(
      'student-123',
      'content-123',
      dto,
    );
  });

  it('should propagate progress errors', async () => {
    progressService.getProgress.mockRejectedValue(new Error('Not enrolled'));

    await expect(
      controller.getProgress('content-123', request),
    ).rejects.toThrow('Not enrolled');
  });
});
