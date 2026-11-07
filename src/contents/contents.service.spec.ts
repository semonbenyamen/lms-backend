import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { ContentsService } from './contents.service.js';
import { ContentItem } from './entities/content-item.entity.js';

describe('ContentsService', () => {
  let service: ContentsService;

  const mockContentItemsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn(),
    remove: vi.fn(),
  };

  const mockLessonsRepo = {
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
        ContentsService,
        {
          provide: getRepositoryToken(ContentItem),
          useValue: mockContentItemsRepo,
        },
        {
          provide: getRepositoryToken(Lesson),
          useValue: mockLessonsRepo,
        },
      ],
    }).compile();

    service = module.get<ContentsService>(ContentsService);
  });

  describe('create', () => {
    const lesson = {
      id: 'l-1',
      section: {
        course: { instructorId: instructorUser.sub, isPublished: true },
      },
    };

    const dto = {
      title: 'Video Lecture',
      contentType: ContentType.VIDEO,
      videoUrl: 'https://example.com/v.mp4',
      orderIndex: 1,
    };

    it('should allow course owner to create content item', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);
      const content = { id: 'ci-1', lessonId: 'l-1', ...dto };
      mockContentItemsRepo.create.mockReturnValue(content);
      mockContentItemsRepo.save.mockResolvedValue(content);

      const result = await service.create('l-1', dto, instructorUser);
      expect(result).toEqual(content);
    });

    it('should allow admin to create content item', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);
      const content = { id: 'ci-1', lessonId: 'l-1', ...dto };
      mockContentItemsRepo.create.mockReturnValue(content);
      mockContentItemsRepo.save.mockResolvedValue(content);

      const result = await service.create('l-1', dto, adminUser);
      expect(result).toEqual(content);
    });

    it('should forbid other instructor from creating content item', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(service.create('l-1', dto, otherInstructorUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject content without the field of its type', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(
        service.create(
          'l-1',
          { title: 'Image', contentType: ContentType.IMAGE, orderIndex: 2 },
          instructorUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });

    it('should save only the fields of the content type', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);
      mockContentItemsRepo.create.mockImplementation((c) => c);
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.create(
        'l-1',
        {
          title: 'Image',
          contentType: ContentType.IMAGE,
          imageUrl: 'https://example.com/i.png',
          videoUrl: 'https://example.com/v.mp4',
          orderIndex: 2,
        },
        instructorUser,
      );

      expect(mockContentItemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyText: null,
          videoUrl: null,
          imageUrl: 'https://example.com/i.png',
        }),
      );
    });

    it('should throw NotFoundException if lesson not found', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(null);

      await expect(service.create('unknown-l', dto, instructorUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findById', () => {
    const publishedContent = {
      id: 'ci-1',
      title: 'Published Content',
      lesson: {
        section: {
          course: { instructorId: instructorUser.sub, isPublished: true },
        },
      },
    };

    const draftContent = {
      id: 'ci-2',
      title: 'Draft Content',
      lesson: {
        section: {
          course: { instructorId: instructorUser.sub, isPublished: false },
        },
      },
    };

    it('should return published content to student', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(publishedContent);

      const result = await service.findById('ci-1', studentUser);
      expect(result).toEqual(publishedContent);
    });

    it('should throw NotFoundException to student for draft content', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(draftContent);

      await expect(service.findById('ci-2', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return draft content to owner instructor', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(draftContent);

      const result = await service.findById('ci-2', instructorUser);
      expect(result).toEqual(draftContent);
    });
  });

  describe('update', () => {
    const content = {
      id: 'ci-1',
      title: 'Old Title',
      contentType: ContentType.TEXT,
      bodyText: 'Old text',
      videoUrl: null,
      imageUrl: null,
      lesson: {
        section: {
          course: { instructorId: instructorUser.sub },
        },
      },
    };

    it('should allow owner to update content item', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('ci-1', { title: 'New' }, instructorUser);
      expect(result.title).toBe('New');
    });

    it('should reject a type change without the field of the new type', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });

      await expect(
        service.update('ci-1', { contentType: ContentType.VIDEO }, instructorUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });

    it('should clear the old field when the type changes', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update(
        'ci-1',
        {
          contentType: ContentType.IMAGE,
          imageUrl: 'https://example.com/i.png',
        },
        instructorUser,
      );

      expect(result).toMatchObject({
        bodyText: null,
        imageUrl: 'https://example.com/i.png',
      });
    });

    it('should forbid other instructor from updating content item', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });

      await expect(
        service.update('ci-1', { title: 'New' }, otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const content = {
      id: 'ci-1',
      lesson: {
        section: {
          course: { instructorId: instructorUser.sub },
        },
      },
    };

    it('should allow owner to remove content item', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockContentItemsRepo.remove.mockResolvedValue(undefined);

      await service.remove('ci-1', instructorUser);
      expect(mockContentItemsRepo.remove).toHaveBeenCalledWith(content);
    });
  });
});
