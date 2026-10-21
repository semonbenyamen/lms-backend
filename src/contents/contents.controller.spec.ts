import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ContentsController } from './contents.controller.js';
import { ContentsService } from './contents.service.js';

describe('ContentsController', () => {
  let controller: ContentsController;

  const mockContentsService = {
    create: vi.fn(),
    findById: vi.fn(),
    findByLesson: vi.fn(),
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
      controllers: [ContentsController],
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
      .compile();

    controller = module.get<ContentsController>(ContentsController);
  });

  it('should create content item', async () => {
    const dto = {
      title: 'Video',
      contentType: ContentType.VIDEO,
      orderIndex: 1,
    };
    mockContentsService.create.mockResolvedValue({ id: 'ci-1', ...dto });

    const result = await controller.create('l-1', dto, mockReq);
    expect(result).toHaveProperty('id', 'ci-1');
  });

  it('should find content item by ID', async () => {
    mockContentsService.findById.mockResolvedValue({ id: 'ci-1' });

    const result = await controller.findOne('ci-1', mockReq);
    expect(result).toEqual({ id: 'ci-1' });
  });

  it('should update content item', async () => {
    mockContentsService.update.mockResolvedValue({ id: 'ci-1', title: 'New' });

    const result = await controller.update('ci-1', { title: 'New' }, mockReq);
    expect(result).toHaveProperty('title', 'New');
  });

  it('should delete content item', async () => {
    mockContentsService.remove.mockResolvedValue(undefined);

    await controller.remove('ci-1', mockReq);
    expect(mockContentsService.remove).toHaveBeenCalledWith('ci-1', mockReq.user);
  });
});
