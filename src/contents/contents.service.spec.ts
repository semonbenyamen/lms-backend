import { BadRequestException, NotFoundException } from '@nestjs/common';
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
    const dto = {
      title: 'Video Lecture',
      contentType: ContentType.VIDEO,
      videoUrl: 'https://example.com/v.mp4',
      orderIndex: 1,
    };

    it('should create the content item in the given lesson', async () => {
      const content = { id: 'ci-1', lessonId: 'l-1', ...dto };
      mockContentItemsRepo.create.mockReturnValue(content);
      mockContentItemsRepo.save.mockResolvedValue(content);

      const result = await service.create('l-1', dto);

      expect(mockContentItemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lessonId: 'l-1', title: 'Video Lecture' }),
      );
      expect(result).toEqual(content);
    });

    it('should reject content without the field of its type', async () => {
      await expect(
        service.create('l-1', {
          title: 'Image',
          contentType: ContentType.IMAGE,
          orderIndex: 2,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });

    it('should save only the fields of the content type', async () => {
      mockContentItemsRepo.create.mockImplementation((c) => c);
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      await service.create('l-1', {
        title: 'Image',
        contentType: ContentType.IMAGE,
        imageUrl: 'https://example.com/i.png',
        videoUrl: 'https://example.com/v.mp4',
        orderIndex: 2,
      });

      expect(mockContentItemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyText: null,
          videoUrl: null,
          imageUrl: 'https://example.com/i.png',
        }),
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

    it('should throw NotFoundException to another instructor for draft content', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(draftContent);

      await expect(
        service.findById('ci-2', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return draft content to the owner and to admins', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(draftContent);

      await expect(service.findById('ci-2', instructorUser)).resolves.toEqual(
        draftContent,
      );
      await expect(service.findById('ci-2', adminUser)).resolves.toEqual(
        draftContent,
      );
    });

    it('should throw NotFoundException when the course was soft deleted', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({
        ...publishedContent,
        lesson: { section: { course: null } },
      });

      await expect(service.findById('ci-1', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByLesson', () => {
    const lesson = {
      id: 'l-1',
      section: {
        course: { instructorId: instructorUser.sub, isPublished: false },
      },
    };

    it('should list the content of a draft lesson for its owner', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);
      mockContentItemsRepo.find.mockResolvedValue([{ id: 'ci-1' }]);

      const result = await service.findByLesson('l-1', instructorUser);

      expect(result).toEqual([{ id: 'ci-1' }]);
    });

    it('should throw NotFoundException to student for a draft lesson', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(lesson);

      await expect(service.findByLesson('l-1', studentUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockContentItemsRepo.find).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the lesson does not exist', async () => {
      mockLessonsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByLesson('missing', instructorUser),
      ).rejects.toThrow(NotFoundException);
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
    };

    it('should update the provided fields', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('ci-1', { title: 'New' });
      expect(result.title).toBe('New');
    });

    it('should reject a type change without the field of the new type', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });

      await expect(
        service.update('ci-1', { contentType: ContentType.VIDEO }),
      ).rejects.toThrow(BadRequestException);
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });

    it('should clear the old field when the type changes', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));

      const result = await service.update('ci-1', {
        contentType: ContentType.IMAGE,
        imageUrl: 'https://example.com/i.png',
      });

      expect(result).toMatchObject({
        bodyText: null,
        imageUrl: 'https://example.com/i.png',
      });
    });

    it('should throw NotFoundException when the content item does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the content item', async () => {
      const content = { id: 'ci-1' };
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockContentItemsRepo.remove.mockResolvedValue(undefined);

      await service.remove('ci-1');
      expect(mockContentItemsRepo.remove).toHaveBeenCalledWith(content);
    });
  });
});
