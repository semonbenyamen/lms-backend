import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { Section } from '../sections/entities/section.entity.js';
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
  };

  const mockSectionsRepo = {
    findOne: vi.fn(),
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
          provide: getRepositoryToken(Section),
          useValue: mockSectionsRepo,
        },
      ],
    }).compile();

    service = module.get<LessonsService>(LessonsService);
  });

  describe('create', () => {
    const section = {
      id: 'section-1',
      course: { instructorId: instructorUser.sub, isPublished: true },
    };

    const createDto = {
      title: 'Introduction to Services',
      orderIndex: 1,
      topic: 'Dependency Injection',
      difficulty: 'beginner',
    };

    it('should allow course owner instructor to create a lesson', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      const createdLesson = { id: 'l-1', sectionId: 'section-1', ...createDto };
      mockLessonsRepo.create.mockReturnValue(createdLesson);
      mockLessonsRepo.save.mockResolvedValue(createdLesson);

      const result = await service.create('section-1', createDto, instructorUser);

      expect(mockLessonsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: 'section-1',
          title: createDto.title,
        }),
      );
      expect(result).toEqual(createdLesson);
    });

    it('should allow admin to create a lesson', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      const createdLesson = { id: 'l-1', sectionId: 'section-1', ...createDto };
      mockLessonsRepo.create.mockReturnValue(createdLesson);
      mockLessonsRepo.save.mockResolvedValue(createdLesson);

      const result = await service.create('section-1', createDto, adminUser);
      expect(result).toEqual(createdLesson);
    });

    it('should forbid non-owner instructor from creating a lesson', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);

      await expect(
        service.create('section-1', createDto, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if section is not found', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create('nonexistent-section', createDto, instructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if the orderIndex is taken', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      mockLessonsRepo.create.mockReturnValue({ sectionId: 'section-1', ...createDto });
      mockLessonsRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
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
        course: { instructorId: instructorUser.sub, isPublished: true },
      },
      contentItems: [],
    };

    const unpublishedLesson = {
      id: 'lesson-2',
      title: 'Draft Lesson',
      section: {
        course: { instructorId: instructorUser.sub, isPublished: false },
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
  });

  describe('findBySection', () => {
    const section = {
      id: 'section-1',
      course: { instructorId: instructorUser.sub, isPublished: true },
    };

    it('should return lessons for a section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      mockLessonsRepo.find.mockResolvedValue([]);

      const result = await service.findBySection('section-1', instructorUser);
      expect(mockLessonsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sectionId: 'section-1' } }),
      );
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    const lesson = {
      id: 'lesson-1',
      title: 'Old Title',
      section: {
        course: { instructorId: instructorUser.sub },
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

      expect(updated.title).toBe('New Title');
    });

    it('should forbid other instructor from updating lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({ ...lesson });

      await expect(
        service.update('lesson-1', { title: 'New Title' }, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const lesson = {
      id: 'lesson-1',
      section: {
        course: { instructorId: instructorUser.sub },
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

      await expect(service.remove('lesson-1', otherInstructorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
