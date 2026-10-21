import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CoursesController } from './courses.controller.js';
import { CoursesService } from './courses.service.js';

describe('CoursesController', () => {
  let controller: CoursesController;

  const mockCoursesService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    createSection: vi.fn(),
    updateSection: vi.fn(),
    removeSection: vi.fn(),
    createLesson: vi.fn(),
    updateLesson: vi.fn(),
    removeLesson: vi.fn(),
    createContentItem: vi.fn(),
    updateContentItem: vi.fn(),
    removeContentItem: vi.fn(),
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
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CoursesController>(CoursesController);
  });

  it('should create a course through service', async () => {
    const dto = {
      title: 'Course 1',
      description: 'Desc',
      category: 'Cat',
      topics: ['Topic 1'],
    };
    mockCoursesService.create.mockResolvedValue({ id: 'c-1', ...dto });

    const result = await controller.create(dto, mockInstructorReq);

    expect(mockCoursesService.create).toHaveBeenCalledWith(
      dto,
      mockInstructorReq.user,
    );
    expect(result).toHaveProperty('id', 'c-1');
  });

  it('should list courses with pagination', async () => {
    mockCoursesService.findAll.mockResolvedValue([]);

    const result = await controller.findAll(
      { page: 1, limit: 10 },
      mockInstructorReq,
    );

    expect(mockCoursesService.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 10 },
      mockInstructorReq.user,
    );
    expect(result).toEqual([]);
  });

  it('should get course details by ID', async () => {
    const course = { id: 'c-1', title: 'Course 1' };
    mockCoursesService.findById.mockResolvedValue(course);

    const result = await controller.findOne('c-1', mockInstructorReq);

    expect(mockCoursesService.findById).toHaveBeenCalledWith(
      'c-1',
      mockInstructorReq.user,
    );
    expect(result).toEqual(course);
  });

  it('should update course through service', async () => {
    mockCoursesService.update.mockResolvedValue({
      id: 'c-1',
      title: 'New Title',
    });

    const result = await controller.update(
      'c-1',
      { title: 'New Title' },
      mockInstructorReq,
    );

    expect(mockCoursesService.update).toHaveBeenCalledWith(
      'c-1',
      { title: 'New Title' },
      mockInstructorReq.user,
    );
    expect(result).toHaveProperty('title', 'New Title');
  });

  it('should delete course through service', async () => {
    mockCoursesService.remove.mockResolvedValue(undefined);

    await controller.remove('c-1', mockInstructorReq);

    expect(mockCoursesService.remove).toHaveBeenCalledWith(
      'c-1',
      mockInstructorReq.user,
    );
  });
});

