import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { LessonsService } from '../lessons/lessons.service.js';
import { ContentsService } from './contents.service.js';
import { ContentItem } from './entities/content-item.entity.js';

describe('ContentsService', () => {
  let service: ContentsService;

  const mockContentItemsRepo = {
    create: vi.fn(),
    save: vi.fn(),
    merge: vi.fn((contentItem: object, changes: object) =>
      Object.assign(contentItem, changes),
    ),
    findOne: vi.fn(),
    find: vi.fn(),
    softRemove: vi.fn(),
  };

  const mockLessonsService = {
    findLessonWithCourse: vi.fn(),
  };

  const mockCloudinaryService = {
    createUploadSignature: vi.fn(),
    getAssetDetails: vi.fn(),
    deleteFile: vi.fn(),
  };

  const mockEnrollmentsService = {
    hasActiveEnrollment: vi.fn(),
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
          provide: LessonsService,
          useValue: mockLessonsService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
        {
          provide: EnrollmentsService,
          useValue: mockEnrollmentsService,
        },
      ],
    }).compile();

    service = module.get<ContentsService>(ContentsService);

    // Content is created in a lesson of course c-1 unless a test says otherwise.
    mockLessonsService.findLessonWithCourse.mockResolvedValue({
      section: { course: { id: 'c-1' } },
    });
  });

  describe('createUploadSignature', () => {
    it('should sign a public id inside the lesson folder', () => {
      const signature = { publicId: 'signed-id', signature: 'abc' };
      mockCloudinaryService.createUploadSignature.mockReturnValue(signature);

      const result = service.createUploadSignature(
        'l-1',
        CloudinaryResourceType.VIDEO,
      );

      expect(result).toBe(signature);
      expect(mockCloudinaryService.createUploadSignature).toHaveBeenCalledWith(
        expect.stringMatching(/^lms\/lessons\/l-1\/[0-9a-f-]{36}$/),
        CloudinaryResourceType.VIDEO,
      );
    });

    it('should give every upload its own public id', () => {
      service.createUploadSignature('l-1', CloudinaryResourceType.IMAGE);
      service.createUploadSignature('l-1', CloudinaryResourceType.IMAGE);

      const [first, second] =
        mockCloudinaryService.createUploadSignature.mock.calls.map(
          ([publicId]) => publicId as string,
        );
      expect(first).not.toBe(second);
    });
  });

  describe('create', () => {
    const dto = {
      title: 'Video Lecture',
      contentType: ContentType.VIDEO,
      videoUrl: 'https://example.com/v.mp4',
      orderIndex: 1,
    };

    it('should create the content item in the given lesson', async () => {
      const content = { lessonId: 'l-1', ...dto };
      mockContentItemsRepo.create.mockReturnValue(content);
      mockContentItemsRepo.save.mockResolvedValue({ id: 'ci-1', ...content });

      await service.create('l-1', dto);

      expect(mockLessonsService.findLessonWithCourse).toHaveBeenCalledWith(
        'l-1',
      );
      expect(mockContentItemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lessonId: 'l-1',
          courseId: 'c-1',
          title: 'Video Lecture',
        }),
      );
      expect(mockContentItemsRepo.save).toHaveBeenCalledWith(content);
    });

    it('should reject content without the field of its type', async () => {
      mockContentItemsRepo.create.mockImplementation((c) => c);

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

    it('should return 409 when the orderIndex is already used in the lesson', async () => {
      mockContentItemsRepo.create.mockImplementation((c) => c);
      mockContentItemsRepo.save.mockRejectedValue(duplicateOrderError);

      await expect(service.create('l-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // What Postgres raises when the unique orderIndex index is broken.
  const duplicateOrderError = new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505' }),
  );

  describe('uploaded media', () => {
    const lessonId = 'l-1';
    const videoId = 'lms/lessons/l-1/video-1';
    const videoAsset = {
      secureUrl: 'https://res.cloudinary.com/demo/video/upload/video-1.mp4',
      publicId: videoId,
      resourceType: 'video',
      format: 'mp4',
      bytes: 1024,
    };

    const videoDto = {
      title: 'Video',
      contentType: ContentType.VIDEO,
      mediaPublicId: videoId,
      orderIndex: 1,
    };

    beforeEach(() => {
      mockContentItemsRepo.create.mockImplementation((c) => ({ ...c }));
      mockContentItemsRepo.save.mockImplementation((c) => Promise.resolve(c));
    });

    describe('create', () => {
      it('should fill the link from the uploaded file and keep its public id', async () => {
        mockCloudinaryService.getAssetDetails.mockResolvedValue(videoAsset);

        await service.create(lessonId, videoDto);

        expect(mockCloudinaryService.getAssetDetails).toHaveBeenCalledWith(
          videoId,
          CloudinaryResourceType.VIDEO,
        );
        expect(mockContentItemsRepo.save).toHaveBeenCalledWith({
          title: 'Video',
          contentType: ContentType.VIDEO,
          orderIndex: 1,
          lessonId,
          courseId: 'c-1',
          bodyText: null,
          videoUrl: videoAsset.secureUrl,
          imageUrl: null,
          durationSeconds: null,
          mediaPublicId: videoId,
        });
      });

      it('should save a link without a public id', async () => {
        await service.create(lessonId, {
          title: 'Video',
          contentType: ContentType.VIDEO,
          videoUrl: 'https://example.com/v.mp4',
          orderIndex: 1,
        });

        expect(mockCloudinaryService.getAssetDetails).not.toHaveBeenCalled();
        expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            videoUrl: 'https://example.com/v.mp4',
            mediaPublicId: null,
          }),
        );
      });

      it('should reject a file uploaded for another lesson', async () => {
        await expect(
          service.create(lessonId, {
            ...videoDto,
            mediaPublicId: 'lms/lessons/l-2/video-1',
          }),
        ).rejects.toThrow('The uploaded file does not belong to this lesson');
        expect(mockCloudinaryService.getAssetDetails).not.toHaveBeenCalled();
      });

      it('should reject a file that is not on Cloudinary', async () => {
        mockCloudinaryService.getAssetDetails.mockResolvedValue(null);

        await expect(service.create(lessonId, videoDto)).rejects.toThrow(
          'The uploaded file was not found',
        );
        expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
      });

      it('should reject a file with a format that is not allowed', async () => {
        mockCloudinaryService.getAssetDetails.mockResolvedValue({
          ...videoAsset,
          format: 'avi',
        });

        await expect(service.create(lessonId, videoDto)).rejects.toThrow(
          BadRequestException,
        );
        expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
      });

      it('should reject a link and a public id together', async () => {
        await expect(
          service.create(lessonId, {
            ...videoDto,
            videoUrl: 'https://example.com/v.mp4',
          }),
        ).rejects.toThrow('Send either mediaPublicId or a link, not both');
      });

      it('should reject a public id for text content', async () => {
        await expect(
          service.create(lessonId, {
            ...videoDto,
            contentType: ContentType.TEXT,
            bodyText: 'Hello',
          }),
        ).rejects.toThrow('mediaPublicId is not allowed for text content');
      });

      it('should return 409 when the file is used by another item', async () => {
        mockCloudinaryService.getAssetDetails.mockResolvedValue(videoAsset);
        mockContentItemsRepo.save.mockRejectedValue(
          new QueryFailedError(
            'INSERT',
            [],
            Object.assign(new Error('duplicate key'), {
              code: '23505',
              constraint: 'UQ_content_items_media_public_id',
            }),
          ),
        );

        await expect(service.create(lessonId, videoDto)).rejects.toThrow(
          'This uploaded file is already used by another content item',
        );
      });
    });

    describe('update', () => {
      const storedVideo = () => ({
        id: 'ci-1',
        lessonId,
        title: 'Video',
        contentType: ContentType.VIDEO,
        bodyText: null,
        videoUrl: 'https://res.cloudinary.com/demo/video/upload/old.mp4',
        imageUrl: null,
        durationSeconds: null,
        mediaPublicId: 'lms/lessons/l-1/old',
      });

      it('should delete the old file after saving a new one', async () => {
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());
        mockCloudinaryService.getAssetDetails.mockResolvedValue(videoAsset);

        await service.update('ci-1', { mediaPublicId: videoId });

        expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            videoUrl: videoAsset.secureUrl,
            mediaPublicId: videoId,
          }),
        );
        expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
          'lms/lessons/l-1/old',
          CloudinaryResourceType.VIDEO,
        );
      });

      it('should delete the old file when a link replaces it', async () => {
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());

        await service.update('ci-1', {
          videoUrl: 'https://example.com/new.mp4',
        });

        expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({
            videoUrl: 'https://example.com/new.mp4',
            mediaPublicId: null,
          }),
        );
        expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
          'lms/lessons/l-1/old',
          CloudinaryResourceType.VIDEO,
        );
      });

      it('should delete the old file when the item becomes text', async () => {
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());

        await service.update('ci-1', {
          contentType: ContentType.TEXT,
          bodyText: 'Now text',
        });

        expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ videoUrl: null, mediaPublicId: null }),
        );
        expect(mockCloudinaryService.deleteFile).toHaveBeenCalledWith(
          'lms/lessons/l-1/old',
          CloudinaryResourceType.VIDEO,
        );
      });

      it('should keep the file when other fields change', async () => {
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());

        await service.update('ci-1', { title: 'New title' });

        expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
          expect.objectContaining({ mediaPublicId: 'lms/lessons/l-1/old' }),
        );
        expect(mockCloudinaryService.deleteFile).not.toHaveBeenCalled();
      });

      it('should not delete the old file when the save fails', async () => {
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());
        mockCloudinaryService.getAssetDetails.mockResolvedValue(videoAsset);
        mockContentItemsRepo.save.mockRejectedValue(new Error('db down'));

        await expect(
          service.update('ci-1', { mediaPublicId: videoId }),
        ).rejects.toThrow('db down');
        expect(mockCloudinaryService.deleteFile).not.toHaveBeenCalled();
      });

      it('should log and not fail when deleting the old file fails', async () => {
        const logError = vi
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(() => undefined);
        mockContentItemsRepo.findOne.mockResolvedValue(storedVideo());
        mockCloudinaryService.getAssetDetails.mockResolvedValue(videoAsset);
        mockCloudinaryService.deleteFile.mockRejectedValue(
          new Error('Cloudinary down'),
        );

        await expect(
          service.update('ci-1', { mediaPublicId: videoId }),
        ).resolves.toBeUndefined();
        expect(logError).toHaveBeenCalled();

        logError.mockRestore();
      });
    });
  });

  describe('getContent', () => {
    const publishedLesson = {
      section: {
        course: {
          id: 'c-1',
          instructorId: instructorUser.sub,
          isPublished: true,
        },
      },
    };

    const draftLesson = {
      section: {
        course: {
          id: 'c-1',
          instructorId: instructorUser.sub,
          isPublished: false,
        },
      },
    };

    const content = { id: 'ci-1', lessonId: 'l-1', title: 'Content' };

    it('should return published content to an enrolled student', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(
        publishedLesson,
      );
      mockEnrollmentsService.hasActiveEnrollment.mockResolvedValue(true);

      const result = await service.getContent('ci-1', studentUser);

      expect(mockEnrollmentsService.hasActiveEnrollment).toHaveBeenCalledWith(
        studentUser.sub,
        'c-1',
      );

      // The content is loaded alone and its course comes from LessonsService.
      expect(mockContentItemsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'ci-1' },
      });
      expect(mockLessonsService.findLessonWithCourse).toHaveBeenCalledWith(
        'l-1',
      );
      expect(result).toEqual(content);
    });

    it('should throw ForbiddenException to a student who is not enrolled', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(
        publishedLesson,
      );
      mockEnrollmentsService.hasActiveEnrollment.mockResolvedValue(false);

      await expect(service.getContent('ci-1', studentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException to another instructor who is not enrolled', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(
        publishedLesson,
      );
      mockEnrollmentsService.hasActiveEnrollment.mockResolvedValue(false);

      await expect(
        service.getContent('ci-1', otherInstructorUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not check an enrollment for the owner or an admin', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(
        publishedLesson,
      );

      await service.getContent('ci-1', instructorUser);
      await service.getContent('ci-1', adminUser);

      expect(mockEnrollmentsService.hasActiveEnrollment).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException to student for draft content', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(draftLesson);

      await expect(service.getContent('ci-1', studentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException to another instructor for draft content', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(draftLesson);

      await expect(
        service.getContent('ci-1', otherInstructorUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return draft content to the owner and to admins', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockLessonsService.findLessonWithCourse.mockResolvedValue(draftLesson);

      await expect(service.getContent('ci-1', instructorUser)).resolves.toEqual(
        content,
      );
      await expect(service.getContent('ci-1', adminUser)).resolves.toEqual(
        content,
      );
    });

    it('should throw NotFoundException when the content item does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(service.getContent('ci-1', adminUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockLessonsService.findLessonWithCourse).not.toHaveBeenCalled();
    });
  });

  describe('findByLesson', () => {
    const lesson = {
      id: 'l-1',
      section: {
        course: {
          id: 'c-1',
          instructorId: instructorUser.sub,
          isPublished: false,
        },
      },
    };

    it('should list the content of a draft lesson for its owner', async () => {
      mockLessonsService.findLessonWithCourse.mockResolvedValue(lesson);
      mockContentItemsRepo.find.mockResolvedValue([{ id: 'ci-1' }]);

      const result = await service.findByLesson('l-1', instructorUser);

      expect(result).toEqual([{ id: 'ci-1' }]);
      // All items are returned in order, without pagination.
      expect(mockContentItemsRepo.find).toHaveBeenCalledWith({
        where: { lessonId: 'l-1' },
        order: { orderIndex: 'ASC' },
      });
    });

    it('should list the content of a published lesson for an enrolled student', async () => {
      mockLessonsService.findLessonWithCourse.mockResolvedValue({
        ...lesson,
        section: { course: { ...lesson.section.course, isPublished: true } },
      });
      mockEnrollmentsService.hasActiveEnrollment.mockResolvedValue(true);
      mockContentItemsRepo.find.mockResolvedValue([{ id: 'ci-1' }]);

      await expect(service.findByLesson('l-1', studentUser)).resolves.toEqual([
        { id: 'ci-1' },
      ]);
    });

    it('should throw ForbiddenException to a student who is not enrolled in the lesson course', async () => {
      mockLessonsService.findLessonWithCourse.mockResolvedValue({
        ...lesson,
        section: { course: { ...lesson.section.course, isPublished: true } },
      });
      mockEnrollmentsService.hasActiveEnrollment.mockResolvedValue(false);

      await expect(service.findByLesson('l-1', studentUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockContentItemsRepo.find).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException to student for a draft lesson', async () => {
      mockLessonsService.findLessonWithCourse.mockResolvedValue(lesson);

      await expect(service.findByLesson('l-1', studentUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockContentItemsRepo.find).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the lesson does not exist', async () => {
      mockLessonsService.findLessonWithCourse.mockRejectedValue(
        new NotFoundException(),
      );

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

      await service.update('ci-1', { title: 'New' });

      expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ci-1', title: 'New' }),
      );
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

      await service.update('ci-1', {
        contentType: ContentType.IMAGE,
        imageUrl: 'https://example.com/i.png',
      });

      expect(mockContentItemsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bodyText: null,
          imageUrl: 'https://example.com/i.png',
        }),
      );
    });

    it('should return 409 when moving to an orderIndex already in use', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({ ...content });
      mockContentItemsRepo.save.mockRejectedValue(duplicateOrderError);

      await expect(service.update('ci-1', { orderIndex: 2 })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when the content item does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockContentItemsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findProgressContentReference', () => {
    it('should return the content type, video length and course', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue({
        id: 'ci-1',
        lessonId: 'l-1',
        courseId: 'c-1',
        contentType: ContentType.VIDEO,
        durationSeconds: 120,
      });

      await expect(
        service.findProgressContentReference('ci-1'),
      ).resolves.toEqual({
        contentType: ContentType.VIDEO,
        durationSeconds: 120,
        courseId: 'c-1',
      });
    });

    it('should throw NotFoundException when the content does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findProgressContentReference('ci-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete the content item', async () => {
      const content = { id: 'ci-1' };
      mockContentItemsRepo.findOne.mockResolvedValue(content);
      mockContentItemsRepo.softRemove.mockResolvedValue(undefined);

      await service.remove('ci-1');
      expect(mockContentItemsRepo.softRemove).toHaveBeenCalledWith(content);
    });

    it('should throw NotFoundException when the content item does not exist', async () => {
      mockContentItemsRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockContentItemsRepo.softRemove).not.toHaveBeenCalled();
    });
  });
});
