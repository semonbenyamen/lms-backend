import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ContentsService } from './contents.service.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';
import { LessonContentsController } from './lesson-contents.controller.js';

describe('LessonContentsController', () => {
  let controller: LessonContentsController;

  const mockContentsService = {
    create: vi.fn(),
    findByLesson: vi.fn(),
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
      controllers: [LessonContentsController],
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

    controller = module.get<LessonContentsController>(LessonContentsController);
  });

  it('should create a content item in the lesson from the route', async () => {
    const dto = {
      title: 'Video',
      contentType: ContentType.VIDEO,
      videoUrl: 'https://example.com/v.mp4',
      orderIndex: 1,
    };
    mockContentsService.create.mockResolvedValue(undefined);

    const result = await controller.create('l-1', dto);

    expect(mockContentsService.create).toHaveBeenCalledWith('l-1', dto);
    // Data is read back with GET, so create returns nothing.
    expect(result).toBeUndefined();
  });

  it('should list the content items of the lesson', async () => {
    mockContentsService.findByLesson.mockResolvedValue([
      { id: 'ci-1', lesson: { id: 'l-1' } },
    ]);

    const result = await controller.findByLesson('l-1', mockReq);

    expect(mockContentsService.findByLesson).toHaveBeenCalledWith(
      'l-1',
      mockReq.user,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'ci-1' });
    expect(result[0]).not.toHaveProperty('lesson');
  });
});
