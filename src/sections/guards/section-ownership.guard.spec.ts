
import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../common/enums/user-role.enum.js';
import { CoursesService } from '../../courses/courses.service.js';
import { Section } from '../entities/section.entity.js';
import { SectionOwnershipGuard } from './section-ownership.guard.js';

describe('SectionOwnershipGuard', () => {
  let guard: SectionOwnershipGuard;

  const courseId = '550e8400-e29b-41d4-a716-446655440000';
  const sectionId = '550e8400-e29b-41d4-a716-446655440001';

  const mockSectionsRepo = {
    findOne: vi.fn(),
  };

  const mockCoursesService = {
    findById: vi.fn(),
  };

  const owner = {
    sub: 'instructor-1',
    role: UserRole.INSTRUCTOR,
  };

  const otherInstructor = {
    sub: 'instructor-2',
    role: UserRole.INSTRUCTOR,
  };

  const admin = {
    sub: 'admin-1',
    role: UserRole.ADMIN,
  };

  const createContext = (
    user: typeof owner,
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
        SectionOwnershipGuard,
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

    guard = module.get<SectionOwnershipGuard>(
      SectionOwnershipGuard,
    );
  });

  describe('Create section', () => {
    it('should allow the course owner', async () => {
      mockCoursesService.findById.mockResolvedValue({
        id: courseId,
        instructorId: owner.sub,
      });

      const context = createContext(owner, { courseId });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow admin', async () => {
      mockCoursesService.findById.mockResolvedValue({
        id: courseId,
        instructorId: owner.sub,
      });

      const context = createContext(admin, { courseId });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject another instructor', async () => {
      mockCoursesService.findById.mockResolvedValue({
        id: courseId,
        instructorId: owner.sub,
      });

      const context = createContext(otherInstructor, { courseId });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Update and delete section', () => {
    it('should allow the course owner', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({
        id: sectionId,
        course: { instructorId: owner.sub },
      });

      const context = createContext(owner, { id: sectionId });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should allow admin', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({
        id: sectionId,
        course: { instructorId: owner.sub },
      });

      const context = createContext(admin, { id: sectionId });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('should reject another instructor', async () => {
      mockSectionsRepo.findOne.mockResolvedValue({
        id: sectionId,
        course: { instructorId: owner.sub },
      });

      const context = createContext(otherInstructor, {
        id: sectionId,
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject a section that does not exist', async () => {
      mockSectionsRepo.findOne.mockResolvedValue(null);

      const context = createContext(owner, { id: sectionId });

      await expect(guard.canActivate(context)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
