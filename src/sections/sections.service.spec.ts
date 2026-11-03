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
import { CoursesService } from '../courses/courses.service.js';
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
          provide: CoursesService,
          useValue: mockCoursesService,
        },
      ],
    }).compile();

    service = module.get<SectionsService>(SectionsService);
  });

  describe('create', () => {
    const course = { id: 'c-1', instructorId: instructorUser.sub };
    const dto = { title: 'Chapter 1', orderIndex: 1 };

    it('should allow course owner to create section', async () => {
      mockCoursesService.findById.mockResolvedValue(course);
      const section = { id: 's-1', courseId: 'c-1', ...dto };
      mockSectionsRepo.create.mockReturnValue(section);
      mockSectionsRepo.save.mockResolvedValue(section);

      const result = await service.create('c-1', dto, instructorUser);
      expect(result).toEqual(section);
    });

    it('should allow admin to create section', async () => {
      mockCoursesService.findById.mockResolvedValue(course);
      const section = { id: 's-1', courseId: 'c-1', ...dto };
      mockSectionsRepo.create.mockReturnValue(section);
      mockSectionsRepo.save.mockResolvedValue(section);

      const result = await service.create('c-1', dto, adminUser);
      expect(result).toEqual(section);
    });

    it('should forbid other instructor from creating section', async () => {
      mockCoursesService.findById.mockResolvedValue(course);

      await expect(service.create('c-1', dto, otherInstructorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if course does not exist', async () => {
      mockCoursesService.findById.mockRejectedValue(new NotFoundException());

      await expect(service.create('unknown-c', dto, instructorUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if the orderIndex is taken', async () => {
      mockCoursesService.findById.mockResolvedValue(course);
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

    it('should return draft section to admin', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      const result = await service.findById('s-2', adminUser);
      expect(result).toEqual(draftSection);
    });

    it('should throw NotFoundException to other instructor for draft section', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(draftSection);

      await expect(
        service.findById('s-2', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if the course was soft deleted', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({
        ...publishedSection,
        course: null,
      });

      await expect(service.findById('s-1', adminUser)).rejects.toThrow(
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
        service.findByCourse('c-1', instructorUser, {}),
      ).resolves.toEqual([]);
    });

    it('should throw NotFoundException to student for a draft course', async () => {
      mockCoursesService.findById.mockResolvedValue(draftCourse);

      await expect(
        service.findByCourse('c-1', studentUser, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should use the default page and limit', async () => {
      mockCoursesService.findById.mockResolvedValue(draftCourse);
      mockSectionsRepo.find.mockResolvedValue([]);

      await service.findByCourse('c-1', instructorUser, {});

      expect(mockSectionsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
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
      mockSectionsRepo.softRemove.mockResolvedValue(undefined);

      await service.remove('s-1', instructorUser);
      expect(mockSectionsRepo.softRemove).toHaveBeenCalledWith(section);
    });
  });
});
