import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { SectionsController } from './sections.controller.js';
import { SectionsService } from './sections.service.js';

describe('SectionsController', () => {
  let controller: SectionsController;

  const mockSectionsService = {
    create: vi.fn(),
    findById: vi.fn(),
    findByCourse: vi.fn(),
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
      controllers: [SectionsController],
      providers: [
        {
          provide: SectionsService,
          useValue: mockSectionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SectionsController>(SectionsController);
  });

  it('should create section', async () => {
    const dto = { title: 'Chapter 1', orderIndex: 1 };
    mockSectionsService.create.mockResolvedValue({ id: 's-1', ...dto });

    const result = await controller.create('c-1', dto, mockReq);
    expect(result).toHaveProperty('id', 's-1');
  });

  it('should find section by ID', async () => {
    mockSectionsService.findById.mockResolvedValue({ id: 's-1' });

    const result = await controller.findOne('s-1', mockReq);
    expect(result).toEqual({ id: 's-1' });
  });

  it('should update section', async () => {
    mockSectionsService.update.mockResolvedValue({ id: 's-1', title: 'New' });

    const result = await controller.update('s-1', { title: 'New' }, mockReq);
    expect(result).toHaveProperty('title', 'New');
  });

  it('should delete section', async () => {
    mockSectionsService.remove.mockResolvedValue(undefined);

    await controller.remove('s-1', mockReq);
    expect(mockSectionsService.remove).toHaveBeenCalledWith('s-1', mockReq.user);
  });
});
