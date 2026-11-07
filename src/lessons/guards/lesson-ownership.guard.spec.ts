import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../common/enums/user-role.enum.js';
import { SectionsService } from '../../sections/sections.service.js';
import { Lesson } from '../entities/lesson.entity.js';
import { LessonOwnershipGuard } from './lesson-ownership.guard.js';

describe('LessonOwnershipGuard', () => {
  let guard: LessonOwnershipGuard;

  const sectionId = '550e8400-e29b-41d4-a716-446655440001';
  const lessonId = '550e8400-e29b-41d4-a716-446655440002';

  const mockLessonsRepo = {
    findOne: vi.fn(),
  };

  const mockSectionsService = {
    findSectionWithCourse: vi.fn(),
  };

  const owner = { sub: 'instructor-1', role: UserRole.INSTRUCTOR };
  const otherInstructor = { sub: 'instructor-2', role: UserRole.INSTRUCTOR };
  const admin = { sub: 'admin-1', role: UserRole.ADMIN };

  const section = { id: sectionId, course: { instructorId: owner.sub } };
  const lesson = { id: lessonId, section };

  const createContext = (
    user: typeof owner | undefined,
    params: Record<string, string>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user, params }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonOwnershipGuard,
        { provide: getRepositoryToken(Lesson), useValue: mockLessonsRepo },
        { provide: SectionsService, useValue: mockSectionsService },
      ],
    }).compile();

    guard = module.get<LessonOwnershipGuard>(LessonOwnershipGuard);
  });

  describe('Create lesson', () => {
    it('should allow the course owner', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      await expect(
        guard.canActivate(createContext(owner, { sectionId })),
      ).resolves.toBe(true);
      expect(mockSectionsService.findSectionWithCourse).toHaveBeenCalledWith(
        sectionId,
      );
    });

    it('should allow an admin', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      await expect(
        guard.canActivate(createContext(admin, { sectionId })),
      ).resolves.toBe(true);
    });

    it('should forbid another instructor', async () => {
      mockSectionsService.findSectionWithCourse.mockResolvedValue(section);

      await expect(
        guard.canActivate(createContext(otherInstructor, { sectionId })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject an invalid section ID', async () => {
      await expect(
        guard.canActivate(createContext(owner, { sectionId: 'bad-id' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockSectionsService.findSectionWithCourse).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the section does not exist', async () => {
      mockSectionsService.findSectionWithCourse.mockRejectedValue(
        new NotFoundException(),
      );

      await expect(
        guard.canActivate(createContext(owner, { sectionId })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Update or delete lesson', () => {
    it('should allow the course owner', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(
        guard.canActivate(createContext(owner, { id: lessonId })),
      ).resolves.toBe(true);
      expect(mockLessonsRepo.findOne).toHaveBeenCalledWith({
        where: { id: lessonId },
        relations: { section: { course: true } },
      });
    });

    it('should forbid another instructor', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(
        guard.canActivate(createContext(otherInstructor, { id: lessonId })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject an invalid lesson ID', async () => {
      await expect(
        guard.canActivate(createContext(owner, { id: 'bad-id' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockLessonsRepo.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the lesson does not exist', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(null);

      await expect(
        guard.canActivate(createContext(owner, { id: lessonId })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the course was soft deleted', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({
        ...lesson,
        section: { ...section, course: null },
      });

      await expect(
        guard.canActivate(createContext(owner, { id: lessonId })),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('should deny when there is no user', async () => {
    await expect(
      guard.canActivate(createContext(undefined, { id: lessonId })),
    ).resolves.toBe(false);
  });
});
