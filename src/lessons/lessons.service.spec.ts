import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CourseDifficulty } from '../common/enums/course-difficulty.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { SectionsService } from '../sections/sections.service.js';
import { Lesson } from './entities/lesson.entity.js';
import { LessonsService } from './lessons.service.js';

describe('LessonsService', () => {
  let service: LessonsService;

  const mockLessonsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    softRemove: vi.fn(),
    merge: vi.fn((lesson: Lesson, dto: Partial<Lesson>) =>
      Object.assign(lesson, dto),
    ),
  };

  const mockSectionsService = {
    findSectionWithCourse: vi.fn(),
  };

  const instructorUser: JwtPayload = {
    sub: 'instructor-1',
    email: 'inst@example.com',
    role: UserRole.INSTRUCTOR,
  };

  const otherInstructorUser: JwtPayload = {
    sub: 'instructor-2',
    email: 'other@example.com',
    role: UserRole.INSTRUCTOR,
  };

  const adminUser: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const studentUser: JwtPayload = {
    sub: 'student-1',
    email: 'student@example.com',
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonsService,
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonsRepo,
        },
        {
          provide: SectionsService,
          useValue: mockSectionsService,
        },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  describe('create', () => {
    const section = {
      id: 'section-1',
      course: {
        instructorId: instructorUser.sub,
        isPublished: true,
      },
    };

    const createDto = {
      title: 'Introduction to Services',
      orderIndex: 1,
      topic: 'Dependency Injection',
      difficulty: CourseDifficulty.BEGINNER,
    };

    it('should allow course owner instructor to create a lesson', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      const createdLesson = {
        id: 'l-1',
        sectionId: 'section-1',
        ...createDto,
      };

      mockLessonsRepo.create.mockReturnValue(createdLesson);
      mockLessonsRepo.save.mockResolvedValue(createdLesson);

      const result = await service.create(
        'section-1',
        createDto,
        instructorUser,
      );

      expect(mockLessonsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: 'section-1',
          title: createDto.title,
        }),
      );

      expect(result).toEqual(createdLesson);
    });

    it('should allow admin to create a lesson', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      const createdLesson = {
        id: 'l-1',
        sectionId: 'section-1',
        ...createDto,
      };

      mockLessonsRepo.create.mockReturnValue(createdLesson);
      mockLessonsRepo.save.mockResolvedValue(createdLesson);

      const result = await service.create('section-1', createDto, adminUser);

      expect(result).toEqual(createdLesson);
    });

    it('should forbid non-owner instructor from creating a lesson', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      await expect(
        service.create('section-1', createDto, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if section is not found', async () => {
      mockSectionsService.findSectionWithCourse.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        service.create('nonexistent-section', createDto, instructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if the orderIndex is taken', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      mockLessonsRepo.create.mockReturnValue({
        sectionId: 'section-1',
        ...createDto,
      });

      mockLessonsRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
          }),
        ),
      );

      await expect(
        service.create('section-1', createDto, instructorUser),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findById', () => {
    const publishedLesson = {
      id: 'lesson-1',
      title: 'Lesson 1',
      section: {
        course: {
          instructorId: instructorUser.sub,
          isPublished: true,
        },
      },
      contentItems: [],
    };

    const unpublishedLesson = {
      id: 'lesson-2',
      title: 'Draft Lesson',
      section: {
        course: {
          instructorId: instructorUser.sub,
          isPublished: false,
        },
      },
      contentItems: [],
    };

    it('should return published lesson to students', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(publishedLesson);

      const result = await service.findById('lesson-1', studentUser);

      expect(result).toEqual(publishedLesson);
    });

    it('should throw NotFoundException for students when course is unpublished', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(unpublishedLesson);

      await expect(service.findById('lesson-2', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return unpublished lesson to course owner instructor', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(unpublishedLesson);

      const result = await service.findById('lesson-2', instructorUser);

      expect(result).toEqual(unpublishedLesson);
    });

    it('should return unpublished lesson to admin', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(unpublishedLesson);

      const result = await service.findById('lesson-2', adminUser);

      expect(result).toEqual(unpublishedLesson);
    });

    it('should throw NotFoundException when lesson does not exist', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('unknown-id', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for other instructor when course is unpublished', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(unpublishedLesson);

      await expect(
        service.findById('lesson-2', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the course was soft deleted', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({
        ...publishedLesson,
        section: { course: null },
      });

      await expect(service.findById('lesson-1', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findBySection', () => {
    const section = {
      id: 'section-1',
      course: {
        instructorId: instructorUser.sub,
        isPublished: true,
      },
    };

    it('should return lessons for a section', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);
      mockLessonsRepo.find.mockResolvedValue([]);

      const result = await service.findBySection('section-1', instructorUser);

      expect(mockLessonsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sectionId: 'section-1' },
        }),
      );

      expect(result).toEqual([]);
    });

    it('should return all lessons without pagination', async () => {
      const lessons = [
        { id: 'lesson-1', sectionId: 'section-1', orderIndex: 1 },
        { id: 'lesson-2', sectionId: 'section-1', orderIndex: 2 },
      ];

      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);
      mockLessonsRepo.find.mockResolvedValue(lessons);

      const result = await service.findBySection('section-1', studentUser);

      expect(result).toEqual(lessons);

      // Verify that lessons are ordered without pagination.
      expect(mockLessonsRepo.find).toHaveBeenCalledWith({
        where: { sectionId: 'section-1' },
        order: { orderIndex: 'ASC' },
      });
    });

    it('should throw NotFoundException to student for an unpublished course', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue({
        ...section,
        course: {
          ...section.course,
          isPublished: false,
        },
      });

      await expect(
        service.findBySection('section-1', studentUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Old Title',
      section: {
        course: {
          instructorId: instructorUser.sub,
        },
      },
    };

    it('should allow course owner to update lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({ ...lesson });
      mockLessonsRepo.save.mockImplementation((l) => Promise.resolve(l));

      const updated = await service.update(
        'lesson-1',
        { title: 'New Title' },
        instructorUser,
      );

      expect(mockLessonsRepo.merge).toHaveBeenCalledWith(expect.anything(), {
        title: 'New Title',
      });

      expect(updated.title).toBe('New Title');
    });

    it('should forbid other instructor from updating lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({ ...lesson });

      await expect(
        service.update('lesson-1', { title: 'New Title' }, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);

      expect(mockLessonsRepo.merge).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const lesson = {
      id: 'lesson-1',
      section: {
        course: {
          instructorId: instructorUser.sub,
        },
      },
    };

    it('should allow owner to delete lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);
      mockLessonsRepo.softRemove.mockResolvedValue(undefined);

      await service.remove('lesson-1', instructorUser);

      expect(mockLessonsRepo.softRemove).toHaveBeenCalledWith(lesson);
    });

    it('should forbid other instructor from deleting lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(
        service.remove('lesson-1', otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);

      expect(mockLessonsRepo.softRemove).not.toHaveBeenCalled();
    });
  });
});
