import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
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
    createUploadSignature: vi.fn(),
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
    const contentItems = [{ id: 'ci-1', lessonId: 'l-1' }];
    mockContentsService.findByLesson.mockResolvedValue(contentItems);

    const result = await controller.findByLesson('l-1', mockReq);

    // Only the id and role of the user are passed on.
    expect(mockContentsService.findByLesson).toHaveBeenCalledWith('l-1', {
      sub: mockReq.user.sub,
      role: mockReq.user.role,
    });
    expect(result).toEqual(contentItems);
  });

  it('should return the upload signature for the lesson from the route', () => {
    const signature = { publicId: 'lms/lessons/l-1/file', signature: 'abc' };
    mockContentsService.createUploadSignature.mockReturnValue(signature);

    const result = controller.createUploadSignature('l-1', {
      resourceType: CloudinaryResourceType.IMAGE,
    });

    expect(result).toBe(signature);
    expect(mockContentsService.createUploadSignature).toHaveBeenCalledWith(
      'l-1',
      CloudinaryResourceType.IMAGE,
    );
  });
});
