import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
import { CourseDifficulty } from '../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../common/enums/course-language.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { softDeleteSectionLessons } from '../lessons/soft-delete-section-lessons.js';
import { Section } from '../sections/entities/section.entity.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { CoursesService } from './courses.service.js';
import { Course } from './entities/course.entity.js';

// The lessons cascade has its own tests, so here it is only checked as a call.
vi.mock('../lessons/soft-delete-section-lessons.js', () => ({
  softDeleteSectionLessons: vi.fn(),
}));

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
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    softDelete: vi.fn(),
    softRemove: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  // Checks that a course has content before it is published.
  const contentQueryBuilder = {
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    getExists: vi.fn(),
  };

  const mockEnrollmentsService = {
    hasActiveEnrollments: vi.fn(),
  };

  const mockCategoriesService = {
    assertExists: vi.fn(),
  };

  const mockCloudinaryService = {
    createUploadSignature: vi.fn(),
    getAssetDetails: vi.fn(),
    deleteFile: vi.fn(),
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
    transactionManager.createQueryBuilder.mockReturnValue(contentQueryBuilder);
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
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: EnrollmentsService,
          useValue: mockEnrollmentsService,
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

  describe('Course Catalog', () => {
    let catalogQueryBuilder: Record<string, ReturnType<typeof vi.fn>>;

    beforeEach(() => {
      catalogQueryBuilder = {
        leftJoin: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
        getOne: vi.fn(),
      };
      mockCoursesRepo.createQueryBuilder.mockReturnValue(catalogQueryBuilder);
    });

    it('should list only the published courses, newest first', async () => {
      catalogQueryBuilder.getManyAndCount.mockResolvedValue([
        [courseEntity('course-1')],
        1,
      ]);

      const result = await service.findPublished({ page: 1, limit: 10 });

      expect(catalogQueryBuilder.where).toHaveBeenCalledWith(
        'course.isPublished = :isPublished',
        { isPublished: true },
      );
      expect(catalogQueryBuilder.orderBy).toHaveBeenCalledWith(
        'course.createdAt',
        'DESC',
      );
      expect(result.items).toEqual([courseResponse('course-1')]);
      expect(result.meta.total).toBe(1);
    });

    it('should return a published course with its ordered sections', async () => {
      catalogQueryBuilder.getOne.mockResolvedValue({
        ...courseEntity('course-1'),
        sections: [
          {
            id: 'section-1',
            courseId: 'course-1',
            title: 'Chapter 1',
            orderIndex: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
            deletedAt: null,
            lessons: [],
          },
        ],
      });

      const result = await service.getPublishedCourse('course-1');

      expect(catalogQueryBuilder.andWhere).toHaveBeenCalledWith(
        'course.isPublished = :isPublished',
        { isPublished: true },
      );
      expect(catalogQueryBuilder.orderBy).toHaveBeenCalledWith(
        'section.orderIndex',
        'ASC',
      );
      expect(result).toEqual({
        ...courseResponse('course-1'),
        sections: [
          {
            id: 'section-1',
            courseId: 'course-1',
            title: 'Chapter 1',
            orderIndex: 1,
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
      });
    });

    it('should answer 404 for a draft or missing course', async () => {
      catalogQueryBuilder.getOne.mockResolvedValue(null);

      await expect(service.getPublishedCourse('course-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Course Publication', () => {
    const draft = () => ({ ...courseEntity('course-1'), isPublished: false });
    const published = () => ({
      ...courseEntity('course-1'),
      isPublished: true,
    });

    it('should lock the course and publish it when it has content', async () => {
      transactionManager.findOne.mockResolvedValue(draft());
      contentQueryBuilder.getExists.mockResolvedValue(true);

      await expect(
        service.setPublication('course-1', { isPublished: true }),
      ).resolves.toBeUndefined();

      expect(transactionManager.findOne).toHaveBeenCalledWith(Course, {
        where: { id: 'course-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(transactionManager.createQueryBuilder).toHaveBeenCalledWith(
        ContentItem,
        'content',
      );
      expect(contentQueryBuilder.where).toHaveBeenCalledWith(
        'section.courseId = :id',
        { id: 'course-1' },
      );
      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'course-1', isPublished: true }),
      );
    });

    it('should not publish a course without content', async () => {
      transactionManager.findOne.mockResolvedValue(draft());
      contentQueryBuilder.getExists.mockResolvedValue(false);

      await expect(
        service.setPublication('course-1', { isPublished: true }),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('should unpublish a course without enrolled students', async () => {
      transactionManager.findOne.mockResolvedValue(published());
      mockEnrollmentsService.hasActiveEnrollments.mockResolvedValue(false);

      await service.setPublication('course-1', { isPublished: false });

      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'course-1', isPublished: false }),
      );
    });

    it('should ask for confirmation before unpublishing a course with enrolled students', async () => {
      transactionManager.findOne.mockResolvedValue(published());
      mockEnrollmentsService.hasActiveEnrollments.mockResolvedValue(true);

      await expect(
        service.setPublication('course-1', { isPublished: false }),
      ).rejects.toThrow(ConflictException);
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('should unpublish a course with enrolled students after confirmation', async () => {
      transactionManager.findOne.mockResolvedValue(published());

      await service.setPublication('course-1', {
        isPublished: false,
        confirmUnpublishWithEnrollments: true,
      });

      expect(
        mockEnrollmentsService.hasActiveEnrollments,
      ).not.toHaveBeenCalled();
      expect(transactionManager.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'course-1', isPublished: false }),
      );
    });

    it('should change nothing when the course already has that state', async () => {
      transactionManager.findOne.mockResolvedValue(published());

      await service.setPublication('course-1', { isPublished: true });

      expect(contentQueryBuilder.getExists).not.toHaveBeenCalled();
      expect(transactionManager.save).not.toHaveBeenCalled();
    });

    it('should reject a course that does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(
        service.setPublication('course-1', { isPublished: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Published Course Lookup', () => {
    it('should return a published course', async () => {
      const course = courseEntity('course-1');
      mockCoursesRepo.findOne.mockResolvedValue(course);

      await expect(service.findPublishedById('course-1')).resolves.toBe(course);
      expect(mockCoursesRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'course-1', isPublished: true },
      });
    });

    it('should answer 404 for a draft or missing course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(service.findPublishedById('course-1')).rejects.toThrow(
        NotFoundException,
      );
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

  describe('Course Thumbnail', () => {
    const newId = 'lms/courses/course-1/thumbnail/new';
    const oldId = 'lms/courses/course-1/thumbnail/old';
    const image = {
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/new.png',
      publicId: newId,
      resourceType: 'image',
      format: 'png',
      bytes: 2048,
    };

    const storedCourse = (thumbnailPublicId: string | null = oldId) => ({
      id: 'course-1',
      title: 'Course',
      instructorId,
      thumbnailUrl: thumbnailPublicId ? 'https://old.png' : null,
      thumbnailPublicId,
    });

    beforeEach(() => {
      mockCoursesRepo.save.mockImplementation((c) => Promise.resolve(c));
    });

    it('should sign an image upload inside the course folder', () => {
      const signature = { publicId: 'signed', signature: 'abc' };
      mockCloudinaryService.createUploadSignature.mockReturnValue(signature);

      expect(service.createThumbnailSignature('course-1')).toBe(signature);
      expect(mockCloudinaryService.createUploadSignature).toHaveBeenCalledWith(
        expect.stringMatching(
          /^lms\/courses\/course-1\/thumbnail\/[0-9a-f-]{36}$/,
        ),
        CloudinaryResourceType.IMAGE,
      );
    });

    it('should set the thumbnail and delete the old image after saving', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());
      mockCloudinaryService.getAssetDetails.mockResolvedValue(image);

      await service.update('course-1', { thumbnailPublicId: newId });

      expect(mockCoursesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: image.secureUrl,
          thumbnailPublicId: newId,
        }),
      );
      expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
        oldId,
        CloudinaryResourceType.IMAGE,
      );
    });

    it('should not delete anything for the first thumbnail', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse(null));
      mockCloudinaryService.getAssetDetails.mockResolvedValue(image);

      await service.update('course-1', { thumbnailPublicId: newId });

      expect(mockCloudinaryService.deleteFile).not.toHaveBeenCalled();
    });

    it('should remove the thumbnail with null', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());

      await service.update('course-1', { thumbnailPublicId: null });

      expect(mockCoursesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnailUrl: null,
          thumbnailPublicId: null,
        }),
      );
      expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
        oldId,
        CloudinaryResourceType.IMAGE,
      );
    });

    it('should keep the thumbnail when other fields change', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());

      await service.update('course-1', { title: 'New title' });

      expect(mockCoursesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ thumbnailPublicId: oldId }),
      );
      expect(mockCloudinaryService.deleteFile).not.toHaveBeenCalled();
    });

    it('should reject an image uploaded for another course', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());

      await expect(
        service.update('course-1', {
          thumbnailPublicId: 'lms/courses/course-2/thumbnail/new',
        }),
      ).rejects.toThrow('The uploaded image does not belong to this course');
      expect(mockCoursesRepo.save).not.toHaveBeenCalled();
    });

    it('should reject an image that is not valid', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());
      mockCloudinaryService.getAssetDetails.mockResolvedValue({
        ...image,
        format: 'gif',
      });

      await expect(
        service.update('course-1', { thumbnailPublicId: newId }),
      ).rejects.toThrow(BadRequestException);
      expect(mockCoursesRepo.save).not.toHaveBeenCalled();
    });

    it('should log and not fail when deleting the old image fails', async () => {
      const logError = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      mockCoursesRepo.findOne.mockResolvedValue(storedCourse());
      mockCloudinaryService.getAssetDetails.mockResolvedValue(image);
      mockCloudinaryService.deleteFile.mockRejectedValue(
        new Error('Cloudinary down'),
      );

      await expect(
        service.update('course-1', { thumbnailPublicId: newId }),
      ).resolves.toBeUndefined();
      expect(logError).toHaveBeenCalled();

      logError.mockRestore();
    });
  });

  describe('Course Deletion', () => {
    const course = {
      id: 'course-1',
      title: 'Course to Delete',
      instructorId,
    };

    it('should soft delete the course with its sections, lessons and content in one transaction', async () => {
      transactionManager.findOne.mockResolvedValue({ ...course });
      mockEnrollmentsService.hasActiveEnrollments.mockResolvedValue(false);
      transactionManager.find.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);

      await service.remove('course-1');

      expect(mockCoursesRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(transactionManager.findOne).toHaveBeenCalledWith(Course, {
        where: { id: 'course-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockEnrollmentsService.hasActiveEnrollments).toHaveBeenCalledWith(
        'course-1',
        transactionManager,
      );
      expect(transactionManager.find).toHaveBeenCalledWith(Section, {
        where: { courseId: 'course-1' },
        select: { id: true },
      });
      expect(softDeleteSectionLessons).toHaveBeenCalledWith(
        transactionManager,
        ['s-1', 's-2'],
      );
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

    it('should reject deletion when the course does not exist', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(service.remove('missing-course')).rejects.toThrow(
        NotFoundException,
      );
      expect(
        mockEnrollmentsService.hasActiveEnrollments,
      ).not.toHaveBeenCalled();
      expect(transactionManager.softRemove).not.toHaveBeenCalled();
    });

    it('should reject deletion when the course has active enrollments', async () => {
      transactionManager.findOne.mockResolvedValue({ ...course });
      mockEnrollmentsService.hasActiveEnrollments.mockResolvedValue(true);

      await expect(service.remove('course-1')).rejects.toThrow(
        ConflictException,
      );
      expect(softDeleteSectionLessons).not.toHaveBeenCalled();
      expect(transactionManager.softDelete).not.toHaveBeenCalled();
      expect(transactionManager.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('Course Enrollment Lookup', () => {
    it('should share lock and return a published course', async () => {
      const course = { id: 'course-1', isPublished: true };
      transactionManager.findOne.mockResolvedValue(course);

      await expect(
        service.findPublishedCourseForEnrollment(
          'course-1',
          transactionManager as never,
        ),
      ).resolves.toBe(course);
      expect(transactionManager.findOne).toHaveBeenCalledWith(Course, {
        where: { id: 'course-1', isPublished: true },
        lock: { mode: 'pessimistic_read' },
      });
    });

    it('should reject a missing or unpublished course', async () => {
      transactionManager.findOne.mockResolvedValue(null);

      await expect(
        service.findPublishedCourseForEnrollment(
          'course-1',
          transactionManager as never,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
