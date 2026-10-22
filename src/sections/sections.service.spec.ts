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
import { Course } from '../courses/entities/course.entity.js';
import { Section } from './entities/section.entity.js';
import { SectionsService } from './sections.service.js';

describe('SectionsService', () => {
  let service: SectionsService;

  const mockSectionsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    remove: vi.fn(),
  };

  const mockCoursesRepo = {
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
        SectionsService,
        {
          provide: getRepositoryToken(Section),
          useValue: mockSectionsRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCoursesRepo,
        },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
  });

  describe('create', () => {
    const course = { id: 'c-1', instructorId: instructorUser.sub };
    const dto = { title: 'Chapter 1', orderIndex: 1 };

    it('should allow course owner to create section', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(course);
      const section = { id: 's-1', courseId: 'c-1', ...dto };
      mockSectionsRepo.create.mockReturnValue(section);
      mockSectionsRepo.save.mockResolvedValue(section);

      const result = await service.create('c-1', dto, instructorUser);
      expect(result).toEqual(section);
    });

    it('should allow admin to create section', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(course);
      const section = { id: 's-1', courseId: 'c-1', ...dto };
      mockSectionsRepo.create.mockReturnValue(section);
      mockSectionsRepo.save.mockResolvedValue(section);

      const result = await service.create('c-1', dto, adminUser);
      expect(result).toEqual(section);
    });

    it('should forbid other instructor from creating section', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(course);

      await expect(service.create('c-1', dto, otherInstructorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(null);

      await expect(service.create('unknown-c', dto, instructorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if the orderIndex is taken', async () => {
      mockCoursesRepo.findOne.mockResolvedValue(course);
      mockSectionsRepo.create.mockReturnValue({ courseId: 'c-1', ...dto });
      mockSectionsRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      await expect(service.create('c-1', dto, instructorUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById', () => {
    const publishedSection = {
      id: 's-1',
      title: 'Section 1',
      course: { instructorId: instructorUser.sub, isPublished: true },
      lessons: [],
    };

    const draftSection = {
      id: 's-2',
      title: 'Draft Section',
      course: { instructorId: instructorUser.sub, isPublished: false },
      lessons: [],
    };

    it('should return published section to student', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(publishedSection);

      const result = await service.findById('s-1', studentUser);
      expect(result).toEqual(publishedSection);
    });

    it('should throw NotFoundException to student for draft section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      await expect(service.findById('s-2', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return draft section to owner instructor', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      const result = await service.findById('s-2', instructorUser);
      expect(result).toEqual(draftSection);
    });
  });

  describe('update', () => {
    const section = {
      id: 's-1',
      title: 'Old',
      course: { instructorId: instructorUser.sub },
    };

    it('should allow owner to update section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({ ...section });
      mockSectionsRepo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.update('s-1', { title: 'New' }, instructorUser);
      expect(result.title).toBe('New');
    });

    it('should forbid other instructor from updating section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({ ...section });

      await expect(
        service.update('s-1', { title: 'New' }, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const section = {
      id: 's-1',
      course: { instructorId: instructorUser.sub },
    };

    it('should allow owner to remove section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(section);
      mockSectionsRepo.remove.mockResolvedValue(undefined);

      await service.remove('s-1', instructorUser);
      expect(mockSectionsRepo.remove).toHaveBeenCalledWith(section);
    });
  });
});
