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
import { Lesson } from '../../lessons/entities/lesson.entity.js';
import { ContentItem } from '../entities/content-item.entity.js';
import { ContentOwnershipGuard } from './content-ownership.guard.js';

describe('ContentOwnershipGuard', () => {
  let guard: ContentOwnershipGuard;

  const lessonId = '550e8400-e29b-41d4-a716-446655440003';
  const contentItemId = '550e8400-e29b-41d4-a716-446655440004';

  const mockLessonsRepo = { findOne: vi.fn() };
  const mockContentItemsRepo = { findOne: vi.fn() };

  const owner = { sub: 'instructor-1', role: UserRole.INSTRUCTOR };
  const otherInstructor = { sub: 'instructor-2', role: UserRole.INSTRUCTOR };
  const admin = { sub: 'admin-1', role: UserRole.ADMIN };

  const course = { instructorId: owner.sub };

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
        ContentOwnershipGuard,
        { provide: getRepositoryToken(Lesson), useValue: mockLessonsRepo },
        {
          provide: getRepositoryToken(ContentItem),
          useValue: mockContentItemsRepo,
        },
      ],
    }).compile();

    guard = module.get<ContentOwnershipGuard>(ContentOwnershipGuard);
  });

  describe('Create content', () => {
    it('should allow the course owner and admins', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({ section: { course } });

      await expect(
        guard.canActivate(createContext(owner, { lessonId })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(createContext(admin, { lessonId })),
      ).resolves.toBe(true);
    });

    it('should forbid another instructor', async () => {
      mockLessonsRepo.findOne.mockResolvedValue({ section: { course } });

      await expect(
        guard.canActivate(createContext(otherInstructor, { lessonId })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when the lesson does not exist', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(null);

      await expect(
        guard.canActivate(createContext(owner, { lessonId })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject an invalid lesson id before querying', async () => {
      await expect(
        guard.canActivate(createContext(owner, { lessonId: 'not-a-uuid' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockLessonsRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe('Update or delete content', () => {
    it('should allow the course owner', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({
        lesson: { section: { course } },
      });

      await expect(
        guard.canActivate(createContext(owner, { id: contentItemId })),
      ).resolves.toBe(true);
    });

    it('should forbid another instructor', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({
        lesson: { section: { course } },
      });

      await expect(
        guard.canActivate(
          createContext(otherInstructor, { id: contentItemId }),
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when the content item does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(
        guard.canActivate(createContext(admin, { id: contentItemId })),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject an invalid content item id before querying', async () => {
      await expect(
        guard.canActivate(createContext(owner, { id: 'not-a-uuid' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockContentItemsRepo.findOne).not.toHaveBeenCalled();
    });
  });

  it('should deny a request without a user', async () => {
    await expect(
      guard.canActivate(createContext(undefined, { lessonId })),
    ).resolves.toBe(false);
  });
});
