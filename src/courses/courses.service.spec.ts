import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';

describe('CoursesService', () => {
  let service: CoursesService;

  const mockCoursesRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    remove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  const instructorUser: JwtPayload = {
    sub: 'instructor-uuid-1',
    email: 'instructor@example.com',
    role: UserRole.INSTRUCTOR,
  };

  const otherInstructorUser: JwtPayload = {
    sub: 'instructor-uuid-2',
    email: 'other@example.com',
    role: UserRole.INSTRUCTOR,
  };

  const adminUser: JwtPayload = {
    sub: 'admin-uuid-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const studentUser: JwtPayload = {
    sub: 'student-uuid-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
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
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  describe('Course Creation', () => {
    const createDto = {
      title: 'NestJS Full Course',
      description: 'Comprehensive course on NestJS architecture',
      category: 'Software Engineering',
      topics: ['NestJS', 'TypeScript', 'Clean Architecture'],
      difficulty: 'intermediate',
      language: 'en',
      prerequisites: ['JavaScript Basics'],
      estimatedDuration: 180,
      isPublished: false,
    };

    it('should allow an instructor to create a course', async () => {
      const mockCourse = {
        id: 'course-1',
        ...createDto,
        instructorId: instructorUser.sub,
      };
      mockCoursesRepo.create.mockReturnValue(mockCourse);
      mockCoursesRepo.save.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, instructorUser);

      expect(mockCoursesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: createDto.title,
          description: createDto.description,
          category: createDto.category,
          topics: createDto.topics,
          instructorId: instructorUser.sub,
        }),
      );
      expect(mockCoursesRepo.save).toHaveBeenCalledWith(mockCourse);
      expect(result).toEqual(mockCourse);
    });

    it('should allow an admin to create a course', async () => {
      const mockCourse = {
        id: 'course-1',
        ...createDto,
        instructorId: adminUser.sub,
      };
      mockCoursesRepo.create.mockReturnValue(mockCourse);
      mockCoursesRepo.save.mockResolvedValue(mockCourse);

      const result = await service.create(createDto, adminUser);

      expect(result).toEqual(mockCourse);
    });

    it('should throw ForbiddenException if a student tries to create a course', async () => {
      await expect(service.create(createDto, studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Course Pagination and Visibility', () => {
    let mockQueryBuilder: {
      orderBy: ReturnType<typeof vi.fn>;
      skip: ReturnType<typeof vi.fn>;
      take: ReturnType<typeof vi.fn>;
      andWhere: ReturnType<typeof vi.fn>;
      getMany: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue([]),
      };
      mockCoursesRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should use default page 1 and limit 10 when parameters are omitted', async () => {
      await service.findAll({}, studentUser);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should reject invalid page parameter (< 1)', async () => {
      await expect(
        service.findAll({ page: 0, limit: 10 }, studentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid limit parameter (< 1)', async () => {
      await expect(
        service.findAll({ page: 1, limit: -5 }, studentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should cap limit at maximum 100', async () => {
      await service.findAll({ page: 1, limit: 200 }, adminUser);

      expect(mockQueryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should restrict student visibility to published courses only', async () => {
      await service.findAll({ page: 1, limit: 10 }, studentUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.isPublished = :isPublished',
        { isPublished: true },
      );
    });

    it('should allow instructors to see published courses and their own drafts', async () => {
      await service.findAll({ page: 1, limit: 10 }, instructorUser);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(course.isPublished = :isPublished OR course.instructorId = :instructorId)',
        { isPublished: true, instructorId: instructorUser.sub },
      );
    });

    it('should allow admins to see all courses without filter', async () => {
      await service.findAll({ page: 1, limit: 10 }, adminUser);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('Course Retrieval by ID', () => {
    const publishedCourse = {
      id: 'course-1',
      title: 'Published Course',
      isPublished: true,
      instructorId: instructorUser.sub,
      sections: [],
    };

    const unpublishedCourse = {
      id: 'course-2',
      title: 'Draft Course',
      isPublished: false,
      instructorId: instructorUser.sub,
      sections: [],
    };

    it('should return published course for students', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(publishedCourse);

      const result = await service.findById('course-1', studentUser);
      expect(result).toEqual(publishedCourse);
    });

    it('should throw NotFoundException for students when course is unpublished', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(unpublishedCourse);

      await expect(service.findById('course-2', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return unpublished course for the owning instructor', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(unpublishedCourse);

      const result = await service.findById('course-2', instructorUser);
      expect(result).toEqual(unpublishedCourse);
    });

    it('should throw NotFoundException for another instructor when course is unpublished', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(unpublishedCourse);

      await expect(
        service.findById('course-2', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return unpublished course for an admin', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(unpublishedCourse);

      const result = await service.findById('course-2', adminUser);
      expect(result).toEqual(unpublishedCourse);
    });

    it('should throw NotFoundException when course ID does not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findById('non-existent-id', studentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Course Update & Ownership Checks', () => {
    const course = {
      id: 'course-1',
      title: 'Original Title',
      instructorId: instructorUser.sub,
    };

    it('should allow the owner instructor to update the course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.save.mockImplementation((c) => Promise.resolve(c));

      const updated = await service.update(
        'course-1',
        { title: 'Updated Title' },
        instructorUser,
      );

      expect(updated.title).toBe('Updated Title');
      expect(mockCoursesRepo.save).toHaveBeenCalled();
    });

    it('should forbid another instructor from updating the course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });

      await expect(
        service.update(
          'course-1',
          { title: 'Hacked Title' },
          otherInstructorUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an admin to update any course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.save.mockImplementation((c) => Promise.resolve(c));

      const updated = await service.update(
        'course-1',
        { title: 'Admin Updated Title' },
        adminUser,
      );

      expect(updated.title).toBe('Admin Updated Title');
    });
  });

  describe('Course Deletion & Ownership Checks', () => {
    const course = {
      id: 'course-1',
      title: 'Course to Delete',
      instructorId: instructorUser.sub,
    };

    it('should allow the owner instructor to delete the course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.remove.mockResolvedValue(undefined);

      await service.remove('course-1', instructorUser);
      expect(mockCoursesRepo.remove).toHaveBeenCalled();
    });

    it('should forbid another instructor from deleting the course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });

      await expect(
        service.remove('course-1', otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow an admin to delete any course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue({ ...course });
      mockCoursesRepo.remove.mockResolvedValue(undefined);

      await service.remove('course-1', adminUser);
      expect(mockCoursesRepo.remove).toHaveBeenCalled();
    });
  });
});