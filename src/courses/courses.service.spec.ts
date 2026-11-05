import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CourseDifficulty } from '../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../common/enums/course-language.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockCoursesRepo = {
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn((course: object, changes: object) =>
      Object.assign(course, changes),
    ),
    findOne: vi.fn(),
    remove: vi.fn(),
    softRemove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const mockCategoriesService = {
    assertExists: vi.fn(),
  };

  const instructorId = 'instructor-uuid-1';

  const instructorUser: JwtPayload = {
    sub: instructorId,
    email: 'instructor@example.com',
    role: UserRole.INSTRUCTOR,
  };

  const adminUser: JwtPayload = {
    sub: 'admin-uuid-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        {
          provide: getRepositoryToken(Course),
          useValue: mockCoursesRepo,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('Course Creation', () => {
    const createDto = {
      title: 'NestJS Full Course',
      description: 'Comprehensive course on NestJS architecture',
      categoryId: 'category-uuid-1',
      topics: ['NestJS', 'TypeScript', 'Clean Architecture'],
      difficulty: CourseDifficulty.INTERMEDIATE,
      language: CourseLanguage.ENGLISH,
      prerequisites: ['JavaScript Basics'],
      estimatedDuration: 180,
    };

    it('should create a course owned by the given instructor', async () => {
      const mockCourse = {
        id: 'course-1',
        ...createDto,
        instructorId,
      };
      mockCoursesRepo.create.mockReturnValue(mockCourse);
      mockCoursesRepo.save.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, instructorId);

      expect(mockCategoriesService.assertExists).toHaveBeenCalledWith(
        createDto.categoryId,
      );
      expect(mockCoursesRepo.create).toHaveBeenCalledWith({
        ...createDto,
        instructorId,
      });
      expect(mockCoursesRepo.save).toHaveBeenCalledWith(mockCourse);
      expect(result).toEqual(mockCourse);
    });

    it('should not create a course with an unknown category', async () => {
      mockCategoriesService.assertExists.mockRejectedValueOnce(
        new NotFoundException(),
      );

      await expect(service.create(createDto, instructorId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCoursesRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Course Pagination and Visibility', () => {
    let mockQueryBuilder: {
      orderBy: ReturnType<typeof vi.fn>;
      skip: ReturnType<typeof vi.fn>;
      take: ReturnType<typeof vi.fn>;
      andWhere: ReturnType<typeof vi.fn>;
      getManyAndCount: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      };
      mockCoursesRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should use default page 1 and limit 10 when parameters are omitted', async () => {
      await service.findAll({}, instructorUser);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should return the courses with the pagination meta', async () => {
      const courses = [{ id: 'course-1' }, { id: 'course-2' }];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([courses, 12]);

      const result = await service.findAll(
        { page: 2, limit: 2 },
        instructorUser,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
      expect(result).toEqual({
        items: courses,
        meta: {
          total: 12,
          page: 2,
          limit: 2,
          totalPages: 6,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('should limit instructors to their own courses', async () => {
      await service.findAll({ page: 1, limit: 10 }, instructorUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.instructorId = :instructorId',
        { instructorId: instructorUser.sub },
      );
    });

    it('should allow admins to see all courses without filter', async () => {
      await service.findAll({ page: 1, limit: 10 }, adminUser);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('Course Retrieval by ID', () => {
    it('should return the course', async () => {
      const course = { id: 'course-1', isPublished: false };
      mockCoursesRepo.findOne.mockResolvedValue(course);

      await expect(service.findById('course-1')).resolves.toEqual(course);
    });

    it('should throw NotFoundException when course ID does not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Course Update', () => {
    const course = {
      id: 'course-1',
      title: 'Original Title',
      instructorId,
    };

    it('should update the provided course fields', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.save.mockImplementation((c) => Promise.resolve(c));

      const updated = await service.update('course-1', {
        title: 'Updated Title',
      });

      expect(updated.title).toBe('Updated Title');
      expect(mockCoursesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'course-1',
          title: 'Updated Title',
        }),
      );
    });

    it('should preserve fields not included in the update', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.save.mockImplementation((c) => Promise.resolve(c));

      const updated = await service.update('course-1', {
        title: 'New Title',
      });

      expect(updated.instructorId).toBe(instructorId);
    });

    it('should reject updates for courses that do not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing-course', { title: 'New Title' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockCoursesRepo.save).not.toHaveBeenCalled();
    });

    it('should check the new category exists before moving the course to it', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCategoriesService.assertExists.mockRejectedValueOnce(
        new NotFoundException(),
      );

      await expect(
        service.update('course-1', { categoryId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockCoursesRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Course Deletion', () => {
    const course = {
      id: 'course-1',
      title: 'Course to Delete',
      instructorId,
    };

    it('should soft delete the course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.softRemove.mockResolvedValue(undefined);

      await service.remove('course-1');

      // Verify that deletion preserves the database record.
      expect(mockCoursesRepo.softRemove).toHaveBeenCalledWith(course);
      expect(mockCoursesRepo.remove).not.toHaveBeenCalled();
    });

    it('should reject deletion when the course does not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-course')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCoursesRepo.softRemove).not.toHaveBeenCalled();
    });
  });
});
