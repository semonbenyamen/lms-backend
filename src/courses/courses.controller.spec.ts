import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { CourseDifficulty } from '../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../common/enums/course-language.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';
import { CourseOwnershipGuard } from './guards/course-ownership.guard.js';

describe('CoursesController', () => {
  let controller: CoursesController;

  const mockCoursesService = {
    create: vi.fn(),
    findAll: vi.fn(),
    getCourse: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockInstructorReq: AuthenticatedRequest = {
    user: {
      sub: 'instructor-1',
      email: 'instructor@example.com',
      role: UserRole.INSTRUCTOR,
    },
  } as unknown as AuthenticatedRequest;

  const courseResponse = {
    id: 'c-1',
    title: 'Course 1',
    description: 'Desc',
    categoryId: 'category-1',
    category: { id: 'category-1', name: 'Backend' },
    topics: ['Topic 1'],
    difficulty: CourseDifficulty.BEGINNER,
    language: CourseLanguage.ENGLISH,
    prerequisites: null,
    estimatedDuration: null,
    isPublished: false,
    thumbnailUrl: null,
    instructorId: 'instructor-1',
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-02T10:00:00.000Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursesController],
      providers: [
        {
          provide: CoursesService,
          useValue: mockCoursesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: vi.fn().mockReturnValue(true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: vi.fn().mockReturnValue(true) })
      .overrideGuard(CourseOwnershipGuard)
      .useValue({ canActivate: vi.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it('should create a course for the current instructor and return its id', async () => {
    const dto = {
      title: 'Course 1',
      description: 'Desc',
      categoryId: 'category-1',
      topics: ['Topic 1'],
      difficulty: CourseDifficulty.BEGINNER,
      language: CourseLanguage.ENGLISH,
    };

    mockCoursesService.create.mockResolvedValue({ id: 'c-1' });

    const result = await controller.create(dto, mockInstructorReq);

    expect(mockCoursesService.create).toHaveBeenCalledWith(
      dto,
      mockInstructorReq.user.sub,
    );
    expect(result).toEqual({ id: 'c-1' });
  });

  it('should list courses for the current user', async () => {
    const pagination = { page: 1, limit: 10 };
    const meta = {
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    };

    mockCoursesService.findAll.mockResolvedValue({
      items: [courseResponse],
      meta,
    });

    const result = await controller.findAll(pagination, mockInstructorReq);

    expect(mockCoursesService.findAll).toHaveBeenCalledWith(
      pagination,
      mockInstructorReq.user,
    );
    expect(result).toEqual({ items: [courseResponse], meta });
  });

  it('should get course details', async () => {
    mockCoursesService.getCourse.mockResolvedValue(courseResponse);

    const result = await controller.findOne('c-1');

    expect(mockCoursesService.getCourse).toHaveBeenCalledWith('c-1');
    expect(result).toEqual(courseResponse);
  });

  it('should update course without returning data', async () => {
    mockCoursesService.update.mockResolvedValue(undefined);

    const result = await controller.update('c-1', {
      title: 'New Title',
    });

    expect(mockCoursesService.update).toHaveBeenCalledWith('c-1', {
      title: 'New Title',
    });
    expect(result).toBeUndefined();
  });

  it('should remove course through service', async () => {
    mockCoursesService.remove.mockResolvedValue(undefined);

    await controller.remove('c-1');

    expect(mockCoursesService.remove).toHaveBeenCalledWith('c-1');
  });
});
