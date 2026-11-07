import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseSectionsController } from './course-sections.controller.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';
import { SectionsController } from './sections.controller.js';
import { SectionsService } from './sections.service.js';

describe('SectionsController', () => {
  let controller: SectionsController;
  let courseSectionsController: CourseSectionsController;

  const mockSectionsService = {
    create: vi.fn(),
    findById: vi.fn(),
    findByCourse: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockReq = {
    user: {
      sub: 'instructor-1',
      email: 'inst@example.com',
      role: UserRole.INSTRUCTOR,
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseSectionsController, SectionsController],
      providers: [
        {
          provide: SectionsService,
          useValue: mockSectionsService,
        },
      ],
    })
      // Mock guards to isolate controller behavior.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SectionOwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SectionsController>(SectionsController);
    courseSectionsController = module.get<CourseSectionsController>(
      CourseSectionsController,
    );
  });

  it('should create section without returning data', async () => {
    const dto = {
      title: 'Chapter 1',
      orderIndex: 1,
    };

    mockSectionsService.create.mockResolvedValue({
      id: 's-1',
      ...dto,
    });

    const result = await courseSectionsController.create('c-1', dto);

    expect(mockSectionsService.create).toHaveBeenCalledWith('c-1', dto);

    // POST should not expose the created section.
    expect(result).toBeUndefined();
  });

  it('should return only public fields when getting a section by ID', async () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const section = {
      id: 's-1',
      courseId: 'c-1',
      title: 'Chapter 1',
      orderIndex: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      course: {
        instructorId: 'instructor-1',
      },
    };

    mockSectionsService.findById.mockResolvedValue(section);

    const result = await controller.findOne('s-1', mockReq);

    expect(mockSectionsService.findById).toHaveBeenCalledWith('s-1', {
      sub: mockReq.user.sub,
      role: mockReq.user.role,
    });

    // Only public DTO fields should be returned.
    expect(result).toEqual({
      id: 's-1',
      courseId: 'c-1',
      title: 'Chapter 1',
      orderIndex: 1,
      createdAt,
      updatedAt,
    });

    expect(result).not.toHaveProperty('course');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('should transform all sections in the list', async () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const sections = [
      {
        id: 's-1',
        courseId: 'c-1',
        title: 'Chapter 1',
        orderIndex: 1,
        createdAt,
        updatedAt,
        deletedAt: null,
      },
      {
        id: 's-2',
        courseId: 'c-1',
        title: 'Chapter 2',
        orderIndex: 2,
        createdAt,
        updatedAt,
        course: {
          instructorId: 'instructor-1',
        },
      },
    ];

    mockSectionsService.findByCourse.mockResolvedValue(sections);

    const result = await courseSectionsController.findByCourse('c-1', mockReq);

    // Verify that the controller passes course ID and user details without pagination.
    expect(mockSectionsService.findByCourse).toHaveBeenCalledWith('c-1', {
      sub: mockReq.user.sub,
      role: mockReq.user.role,
    });

    // Every section must be transformed into its public DTO.
    expect(result).toEqual([
      {
        id: 's-1',
        courseId: 'c-1',
        title: 'Chapter 1',
        orderIndex: 1,
        createdAt,
        updatedAt,
      },
      {
        id: 's-2',
        courseId: 'c-1',
        title: 'Chapter 2',
        orderIndex: 2,
        createdAt,
        updatedAt,
      },
    ]);

    expect(result[0]).not.toHaveProperty('deletedAt');
    expect(result[1]).not.toHaveProperty('course');
  });

  it('should update section without returning data', async () => {
    const dto = { title: 'New' };

    mockSectionsService.update.mockResolvedValue({
      id: 's-1',
      title: 'New',
    });

    const result = await controller.update('s-1', dto);

    expect(mockSectionsService.update).toHaveBeenCalledWith('s-1', dto);

    // PATCH should not expose the updated section.
    expect(result).toBeUndefined();
  });

  it('should delete section', async () => {
    mockSectionsService.remove.mockResolvedValue(undefined);

    await controller.remove('s-1');

    // Only the section ID is passed to the service.
    expect(mockSectionsService.remove).toHaveBeenCalledWith('s-1');
  });
});
