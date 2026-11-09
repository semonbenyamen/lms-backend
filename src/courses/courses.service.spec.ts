import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CourseDifficulty } from '../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../common/enums/course-language.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { Section } from '../sections/entities/section.entity.js';
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
    manager: {
      transaction: vi.fn(),
    },
  };

  // The delete runs its queries on the transaction manager.
  const transactionManager = {
    find: vi.fn(),
    softDelete: vi.fn(),
    softRemove: vi.fn(),
  };

  const mockCategoriesService = {
    assertExists: vi.fn(),
  };

  // Loads the course with its category after a create, read or update.
  const courseQueryBuilder = {
    leftJoin: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
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

  const timestamp = new Date('2026-11-01T10:00:00.000Z');

  const courseResponse = (id: string) => ({
    id,
    title: 'NestJS',
    description: 'Backend course',
    categoryId: 'category-uuid-1',
    category: { id: 'category-uuid-1', name: 'Backend' },
    topics: ['NestJS'],
    difficulty: CourseDifficulty.BEGINNER,
    language: CourseLanguage.ENGLISH,
    prerequisites: null,
    estimatedDuration: null,
    isPublished: false,
    thumbnailUrl: null,
    instructorId,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Internal fields must not reach the response.
  const courseEntity = (id: string) => ({
    ...courseResponse(id),
    thumbnailPublicId: null,
    deletedAt: null,
    instructor: { id: instructorId, passwordHash: 'hash' },
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockCoursesRepo.manager.transaction.mockImplementation(
      (work: (manager: typeof transactionManager) => Promise<void>) =>
        work(transactionManager),
    );
    mockCoursesRepo.createQueryBuilder.mockReturnValue(courseQueryBuilder);
    courseQueryBuilder.getOne.mockImplementation(
      () => mockCoursesRepo.save.mock.results.at(-1)?.value,
    );

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
      // Only the new id is returned, so the course is not loaded again.
      expect(courseQueryBuilder.getOne).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'course-1' });
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
      leftJoin: ReturnType<typeof vi.fn>;
      addSelect: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
      skip: ReturnType<typeof vi.fn>;
      take: ReturnType<typeof vi.fn>;
      andWhere: ReturnType<typeof vi.fn>;
      getManyAndCount: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoin: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
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

    it('should return the courses without internal fields and with the pagination meta', async () => {
      const courses = [courseEntity('course-1'), courseEntity('course-2')];
      mockQueryBuilder.getManyAndCount.mockResolvedValue([courses, 12]);

      const result = await service.findAll(
        { page: 2, limit: 2 },
        instructorUser,
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(2);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(2);
      expect(result).toEqual({
        items: [courseResponse('course-1'), courseResponse('course-2')],
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

    it('should load only the id and name of the category', async () => {
      await service.findAll({}, instructorUser);

      expect(mockQueryBuilder.leftJoin).toHaveBeenCalledWith(
        'course.category',
        'category',
      );
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith([
        'category.id',
        'category.name',
      ]);
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
    it('should return the course details without internal fields', async () => {
      courseQueryBuilder.getOne.mockResolvedValueOnce(courseEntity('course-1'));

      await expect(service.getCourse('course-1')).resolves.toEqual(
        courseResponse('course-1'),
      );
    });

    it('should return the entity for other services', async () => {
      const course = { id: 'course-1', isPublished: false };
      courseQueryBuilder.getOne.mockResolvedValueOnce(course);

      await expect(service.findById('course-1')).resolves.toEqual(course);
    });

    it('should throw NotFoundException when course ID does not exist', async () => {
      courseQueryBuilder.getOne.mockResolvedValueOnce(null);

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

      await service.update('course-1', {
        title: 'Updated Title',
      });

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

      await service.update('course-1', {
        title: 'New Title',
      });

      expect(mockCoursesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ instructorId }),
      );
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

    it('should soft delete the course, its sections and their lessons in one transaction', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      transactionManager.find.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);

      await service.remove('course-1');

      expect(mockCoursesRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(transactionManager.softDelete).toHaveBeenCalledWith(Lesson, {
        sectionId: In(['s-1', 's-2']),
        deletedAt: IsNull(),
      });
      expect(transactionManager.softDelete).toHaveBeenCalledWith(Section, {
        courseId: 'course-1',
        deletedAt: IsNull(),
      });
      expect(transactionManager.softRemove).toHaveBeenCalledWith(
        Course,
        course,
      );
      // Deletion preserves the database records.
      expect(mockCoursesRepo.remove).not.toHaveBeenCalled();
    });

    it('should skip the lessons when the course has no sections', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      transactionManager.find.mockResolvedValue([]);

      await service.remove('course-1');

      expect(transactionManager.softDelete).toHaveBeenCalledTimes(1);
      expect(transactionManager.softDelete).toHaveBeenCalledWith(Section, {
        courseId: 'course-1',
        deletedAt: IsNull(),
      });
    });

    it('should reject deletion when the course does not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-course')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCoursesRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });
});
