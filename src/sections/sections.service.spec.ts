import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CoursesService } from '../courses/courses.service.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { Section } from './entities/section.entity.js';
import { SectionsService } from './sections.service.js';

describe('SectionsService', () => {
  let service: SectionsService;

  const mockSectionsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    softRemove: vi.fn(),
    merge: vi.fn((section: Section, dto: Partial<Section>) =>
      Object.assign(section, dto),
    ),
  };

  const mockLessonsRepo = {
    count: vi.fn(),
  };

  const mockCoursesService = {
    findById: vi.fn(),
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
        SectionsService,
        {
          provide: getRepositoryToken(Section),
          useValue: mockSectionsRepo,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonsRepo,
        },
        {
          provide: CoursesService,
          useValue: mockCoursesService,
        },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
  });

  describe('create', () => {
    const course = {
      id: 'c-1',
      instructorId: instructorUser.sub,
    };

    const dto = {
      title: 'Chapter 1',
      orderIndex: 1,
    };

    it('should create a section in an existing course', async () => {
      mockCoursesService.findById.mockResolvedValue(course);

      const section = {
        id: 's-1',
        courseId: 'c-1',
        ...dto,
      };

      mockSectionsRepo.create.mockReturnValue(section);
      mockSectionsRepo.save.mockResolvedValue(section);

      // Authorization is handled by SectionOwnershipGuard.
      await expect(service.create('c-1', dto)).resolves.toBeUndefined();

      expect(mockCoursesService.findById).toHaveBeenCalledWith('c-1');

      expect(mockSectionsRepo.create).toHaveBeenCalledWith({
        courseId: 'c-1',
        ...dto,
      });

      expect(mockSectionsRepo.save).toHaveBeenCalledWith(section);
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockCoursesService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.create('unknown-c', dto)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockSectionsRepo.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if the orderIndex is taken', async () => {
      mockCoursesService.findById.mockResolvedValue(course);

      mockSectionsRepo.create.mockReturnValue({
        courseId: 'c-1',
        ...dto,
      });

      mockSectionsRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), {
            code: '23505',
          }),
        ),
      );

      await expect(service.create('c-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getSection', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');

    const publishedSection = {
      id: 's-1',
      courseId: 'c-1',
      title: 'Section 1',
      orderIndex: 1,
      createdAt,
      updatedAt,
      course: {
        instructorId: instructorUser.sub,
        isPublished: true,
      },
    };

    const draftSection = {
      ...publishedSection,
      id: 's-2',
      title: 'Draft Section',
      orderIndex: 2,
      course: {
        instructorId: instructorUser.sub,
        isPublished: false,
      },
    };

    const expectedPublishedSection = {
      id: 's-1',
      courseId: 'c-1',
      title: 'Section 1',
      orderIndex: 1,
      createdAt,
      updatedAt,
    };

    const expectedDraftSection = {
      id: 's-2',
      courseId: 'c-1',
      title: 'Draft Section',
      orderIndex: 2,
      createdAt,
      updatedAt,
    };

    it('should return published section to student', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(publishedSection);

      const result = await service.getSection('s-1', studentUser);

      expect(result).toEqual(expectedPublishedSection);
    });

    it('should throw NotFoundException to student for draft section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      await expect(service.getSection('s-2', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return draft section to owner instructor', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      const result = await service.getSection('s-2', instructorUser);

      expect(result).toEqual(expectedDraftSection);
    });

    it('should return draft section to admin', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      const result = await service.getSection('s-2', adminUser);

      expect(result).toEqual(expectedDraftSection);
    });

    it('should throw NotFoundException to other instructor for draft section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      await expect(
        service.getSection('s-2', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    // A section of a deleted course is deleted with it, so it is not found.
    it('should throw NotFoundException when the section does not exist', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(null);

      await expect(service.getSection('s-1', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCourse', () => {
    const draftCourse = {
      id: 'c-1',
      instructorId: instructorUser.sub,
      isPublished: false,
    };

    it('should list sections of a draft course for the owner', async () => {
      mockCoursesService.findById.mockResolvedValue(draftCourse);
      mockSectionsRepo.find.mockResolvedValue([]);

      await expect(
        service.findByCourse('c-1', instructorUser),
      ).resolves.toEqual([]);
    });

    it('should return all sections without pagination', async () => {
      const createdAt = new Date('2026-01-01T00:00:00.000Z');
      const updatedAt = new Date('2026-01-02T00:00:00.000Z');

      const sections = [
        {
          id: 's-1',
          courseId: 'c-1',
          title: 'Section 1',
          orderIndex: 1,
          createdAt,
          updatedAt,
        },
        {
          id: 's-2',
          courseId: 'c-1',
          title: 'Section 2',
          orderIndex: 2,
          createdAt,
          updatedAt,
        },
      ];

      mockCoursesService.findById.mockResolvedValue(draftCourse);
      mockSectionsRepo.find.mockResolvedValue(sections);

      const result = await service.findByCourse('c-1', instructorUser);

      expect(result).toEqual([
        {
          id: 's-1',
          courseId: 'c-1',
          title: 'Section 1',
          orderIndex: 1,
          createdAt,
          updatedAt,
        },
        {
          id: 's-2',
          courseId: 'c-1',
          title: 'Section 2',
          orderIndex: 2,
          createdAt,
          updatedAt,
        },
      ]);

      // Verify that the query has no pagination limits.
      expect(mockSectionsRepo.find).toHaveBeenCalledWith({
        where: { courseId: 'c-1' },
        order: { orderIndex: 'ASC' },
      });
    });

    it('should throw NotFoundException to student for a draft course', async () => {
      mockCoursesService.findById.mockResolvedValue(draftCourse);

      await expect(service.findByCourse('c-1', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const section = {
      id: 's-1',
      title: 'Old',
      course: {
        instructorId: instructorUser.sub,
      },
    };

    it('should update section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({ ...section });
      mockSectionsRepo.save.mockImplementation((s) => Promise.resolve(s));

      await expect(
        service.update('s-1', { title: 'New' }),
      ).resolves.toBeUndefined();

      expect(mockSectionsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New' }),
      );
    });

    it('should update orderIndex to 0', async () => {
      const section = {
        id: 's-1',
        title: 'Old',
        orderIndex: 2,
        course: {
          instructorId: instructorUser.sub,
        },
      };

      mockSectionsRepo.findOne.mockResolvedValue({ ...section });
      mockSectionsRepo.save.mockImplementation(async (entity) => entity);

      await expect(
        service.update('s-1', { orderIndex: 0 }),
      ).resolves.toBeUndefined();

      // Verify that zero is a valid orderIndex.
      expect(mockSectionsRepo.merge).toHaveBeenCalledWith(expect.anything(), {
        orderIndex: 0,
      });

      expect(mockSectionsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ orderIndex: 0 }),
      );
    });
  });

  describe('remove', () => {
    const section = {
      id: 's-1',
      courseId: 'c-1',
      course: {
        instructorId: instructorUser.sub,
      },
    };

    it('should remove a section without lessons', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      mockLessonsRepo.count.mockResolvedValue(0);
      mockSectionsRepo.softRemove.mockResolvedValue(undefined);

      await expect(service.remove('s-1')).resolves.toBeUndefined();

      // Verify that the service checks for active lessons.
      expect(mockLessonsRepo.count).toHaveBeenCalledWith({
        where: { sectionId: 's-1' },
      });

      // Allow deletion when no active lessons exist.
      expect(mockSectionsRepo.softRemove).toHaveBeenCalledWith(section);
    });

    it('should throw ConflictException if section contains lessons', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      mockLessonsRepo.count.mockResolvedValue(2);

      // Prevent deleting a section with active lessons.
      await expect(service.remove('s-1')).rejects.toThrow(ConflictException);

      expect(mockLessonsRepo.count).toHaveBeenCalledWith({
        where: { sectionId: 's-1' },
      });

      // The section must not be deleted.
      expect(mockSectionsRepo.softRemove).not.toHaveBeenCalled();
    });
  });
});
