import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ContentsController } from './contents.controller.js';
import { ContentsService } from './contents.service.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';

describe('ContentsController', () => {
  let lessonContentsController: LessonContentsController;
  let controller: ContentsController;

  const mockContentsService = {
    getContent: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockReq: AuthenticatedRequest = {
    user: {
      sub: 'instructor-1',
      email: 'inst@example.com',
      role: UserRole.INSTRUCTOR,
    },
  } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LessonContentsController, ContentsController],
      providers: [
        {
          provide: ContentsService,
          useValue: mockContentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ContentOwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    lessonContentsController = module.get<LessonContentsController>(
      LessonContentsController,
    );
    controller = module.get<ContentsController>(ContentsController);
  });

  it('should return the content item from the service', async () => {
    const contentItem = { id: 'ci-1', lessonId: 'l-1' };
    mockContentsService.getContent.mockResolvedValue(contentItem);

    const result = await controller.findOne('ci-1', mockReq);

    // Only the id and role of the user are passed on.
    expect(mockContentsService.getContent).toHaveBeenCalledWith('ci-1', {
      sub: 'instructor-1',
      role: UserRole.INSTRUCTOR,
    });
    expect(result).toEqual(contentItem);
  });

  it('should update the content item without returning data', async () => {
    mockContentsService.update.mockResolvedValue(undefined);

    const result = await controller.update('ci-1', { title: 'New' });

    expect(mockContentsService.update).toHaveBeenCalledWith('ci-1', {
      title: 'New',
    });
    expect(result).toBeUndefined();
  });

  it('should delete content item', async () => {
    mockContentsService.remove.mockResolvedValue(undefined);

    await controller.remove('ci-1');
    expect(mockContentsService.remove).toHaveBeenCalledWith('ci-1');
  });
});
