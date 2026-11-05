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
    findById: vi.fn(),
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

  it('should create a course with only the instructor id', async () => {
    const dto = {
      title: 'Course 1',
      description: 'Desc',
      categoryId: 'category-1',
      topics: ['Topic 1'],
      difficulty: CourseDifficulty.BEGINNER,
      language: CourseLanguage.ENGLISH,
    };

    mockCoursesService.create.mockResolvedValue({
      id: 'c-1',
      ...dto,
    });

    const result = await controller.create(dto, mockInstructorReq);

    expect(mockCoursesService.create).toHaveBeenCalledWith(
      dto,
      mockInstructorReq.user.sub,
    );

    expect(result).toHaveProperty('id', 'c-1');
  });

  it('should list courses for the current user', async () => {
    const pagination = { page: 1, limit: 10 };

    const paginatedCourses = {
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

    mockCoursesService.findAll.mockResolvedValue(paginatedCourses);

    const result = await controller.findAll(pagination, mockInstructorReq);

    expect(mockCoursesService.findAll).toHaveBeenCalledWith(
      pagination,
      mockInstructorReq.user,
    );
    expect(result).toEqual(paginatedCourses);
  });

  it('should get course details through service', async () => {
    const course = { id: 'c-1', isPublished: false };

    mockCoursesService.findById.mockResolvedValue(course);

    const result = await controller.findOne('c-1');

    expect(mockCoursesService.findById).toHaveBeenCalledWith('c-1');
    expect(result).toEqual(course);
  });

  it('should update course through service', async () => {
    mockCoursesService.update.mockResolvedValue({
      id: 'c-1',
      title: 'New Title',
    });

    const result = await controller.update('c-1', {
      title: 'New Title',
    });

    expect(mockCoursesService.update).toHaveBeenCalledWith('c-1', {
      title: 'New Title',
    });

    expect(result).toHaveProperty('title', 'New Title');
  });

  it('should remove course through service', async () => {
    mockCoursesService.remove.mockResolvedValue(undefined);

    await controller.remove('c-1');

    expect(mockCoursesService.remove).toHaveBeenCalledWith('c-1');
  });
});
