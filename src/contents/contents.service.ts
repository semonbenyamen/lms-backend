import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { canReadCourse } from '../common/authorization/authorization.util.js';
import { assertValidAsset } from '../common/cloudinary/assert-valid-asset.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { LessonsService } from '../lessons/lessons.service.js';
import {
  getTypeFieldError,
  pickTypeFields,
  TypeFieldValues,
} from './content-type-fields.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { CreateContentItemDto } from './dto/create-content-item.dto.js';
import { UpdateContentItemDto } from './dto/update-content-item.dto.js';
import { ContentItem } from './entities/content-item.entity.js';
import { toContentItemResponseDto } from './transformers/content-item-response.transformer.js';

// Every file uploaded for a lesson starts with this prefix.
export const lessonMediaPrefix = (lessonId: string): string =>
  `lms/lessons/${lessonId}/`;

const MEDIA_PUBLIC_ID_INDEX = 'UQ_content_items_media_public_id';

type MediaContentType = ContentType.VIDEO | ContentType.IMAGE;

// The Cloudinary kind of each content type that can hold an uploaded file.
const MEDIA_RESOURCE_TYPE: Record<MediaContentType, CloudinaryResourceType> = {
  [ContentType.VIDEO]: CloudinaryResourceType.VIDEO,
  [ContentType.IMAGE]: CloudinaryResourceType.IMAGE,
};

// The link field an uploaded file fills for each content type.
const MEDIA_URL_FIELD = {
  [ContentType.VIDEO]: 'videoUrl',
  [ContentType.IMAGE]: 'imageUrl',
} as const;

const isMediaType = (
  contentType: ContentType,
): contentType is MediaContentType => contentType in MEDIA_RESOURCE_TYPE;

type MediaInput = Pick<
  CreateContentItemDto,
  'mediaPublicId' | 'videoUrl' | 'imageUrl'
>;

// What the progress needs to check a content and its course.
export type ProgressContentReference = Pick<
  ContentItem,
  'contentType' | 'durationSeconds'
> & { courseId: string };

@Injectable()
export class ContentsService {
  private readonly logger = new Logger(ContentsService.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly contentItemsRepository: Repository<ContentItem>,
    private readonly lessonsService: LessonsService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // Ownership of the lesson is verified by ContentOwnershipGuard before this runs.
  // The lesson id in the public id ties the uploaded file to this lesson.
  createUploadSignature(
    lessonId: string,
    resourceType: CloudinaryResourceType,
  ): UploadSignatureResponseDto {
    return this.cloudinaryService.createUploadSignature(
      `${lessonMediaPrefix(lessonId)}${randomUUID()}`,
      resourceType,
    );
  }

  // Ownership of the lesson is verified by ContentOwnershipGuard before this runs.
  async create(lessonId: string, dto: CreateContentItemDto): Promise<void> {
    this.assertMediaInput(dto.contentType, dto);

    const lesson = await this.lessonsService.findLessonWithCourse(lessonId);

    const { mediaPublicId, ...fields } = dto;
    const contentItem = this.contentItemsRepository.create({
      ...fields,
      lessonId,
      courseId: lesson.section.course.id,
      mediaPublicId: null,
    });

    if (mediaPublicId) {
      await this.attachUploadedMedia(contentItem, mediaPublicId);
    }

    this.applyTypeFields(contentItem);
    await this.saveContentItem(contentItem);
  }

  async getContent(
    id: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItemResponseDto> {
    const notFoundMessage = `Content item with ID ${id} not found`;

    // The course is needed for the access check, so it comes in the same
    // query, and the content is returned only after the check.
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: { course: true },
    });

    if (!contentItem) {
      throw new NotFoundException(notFoundMessage);
    }

    await this.assertCanReadContent(contentItem.course, user, notFoundMessage);

    return toContentItemResponseDto(contentItem);
  }

  async findByLesson(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItemResponseDto[]> {
    const lesson = await this.lessonsService.findLessonWithCourse(lessonId);

    await this.assertCanReadContent(
      lesson.section.course,
      user,
      `Lesson with ID ${lessonId} not found`,
    );

    // A lesson has few items, so they are returned in one ordered list.
    const contentItems = await this.contentItemsRepository.find({
      where: { lessonId },
      order: { orderIndex: 'ASC' },
    });

    return contentItems.map(toContentItemResponseDto);
  }

  // Ownership is verified by ContentOwnershipGuard before this runs.
  async update(id: string, dto: UpdateContentItemDto): Promise<void> {
    const contentItem = await this.findContentItemEntity(id);
    const oldMedia = {
      publicId: contentItem.mediaPublicId,
      contentType: contentItem.contentType,
    };

    this.assertMediaInput(dto.contentType ?? contentItem.contentType, dto);

    // Apply only the fields provided in the update request.
    const { mediaPublicId, ...changes } = dto;
    this.contentItemsRepository.merge(contentItem, changes);

    if (mediaPublicId) {
      await this.attachUploadedMedia(contentItem, mediaPublicId);
    } else if (this.leavesStoredMedia(dto, oldMedia.contentType)) {
      // A new link or a new type no longer points at the stored file.
      contentItem.mediaPublicId = null;
    }

    // The result must still match its type, e.g. a type change brings its field.
    this.applyTypeFields(contentItem);
    await this.saveContentItem(contentItem);

    if (oldMedia.publicId && oldMedia.publicId !== contentItem.mediaPublicId) {
      await this.deleteReplacedMedia(oldMedia.publicId, oldMedia.contentType);
    }
  }

  // Ownership is verified by ContentOwnershipGuard before this runs.
  async remove(id: string): Promise<void> {
    const contentItem = await this.findContentItemEntity(id);

    // Preserve the record instead of permanently deleting it.
    await this.contentItemsRepository.softRemove(contentItem);
  }

  // The progress needs the type, the video length and the course of a content.
  // Deleted content is skipped, so it does not exist for progress either.
  async contentExists(id: string): Promise<boolean> {
    return this.contentItemsRepository.exists({ where: { id } });
  }

  // The live content of a course with its lesson, for the course progress.
  // Deleting a section or lesson also deletes its content, so no join is needed.
  async findCourseContentLessons(
    courseId: string,
    manager?: EntityManager,
  ): Promise<Pick<ContentItem, 'id' | 'lessonId'>[]> {
    return (manager ?? this.contentItemsRepository.manager).find(ContentItem, {
      select: { id: true, lessonId: true },
      where: { courseId },
    });
  }

  // The number of live content items in each course, so the progress of
  // many courses comes from one query.
  async countCourseContents(courseIds: string[]): Promise<Map<string, number>> {
    if (!courseIds.length) {
      return new Map();
    }

    const rows = await this.contentItemsRepository
      .createQueryBuilder('content')
      .select('content.courseId', 'courseId')
      .addSelect('COUNT(*)', 'total')
      .where('content.courseId IN (:...courseIds)', { courseIds })
      .groupBy('content.courseId')
      .getRawMany<{ courseId: string; total: string }>();

    return new Map(rows.map((row) => [row.courseId, Number(row.total)]));
  }

  async findProgressContentReference(
    id: string,
  ): Promise<ProgressContentReference> {
    const contentItem = await this.findContentItemEntity(id);

    return {
      contentType: contentItem.contentType,
      durationSeconds: contentItem.durationSeconds,
      courseId: contentItem.courseId,
    };
  }

  // --- Helper Methods ---

  // A draft course's content looks missing to users who cannot read it.
  // Everyone sees the lesson names, but the content itself is only for the
  // course owner, admins and the students enrolled in the course.
  private async assertCanReadContent(
    course: Course,
    user: Pick<JwtPayload, 'sub' | 'role'>,
    notFoundMessage: string,
  ): Promise<void> {
    if (!canReadCourse(course, user)) {
      throw new NotFoundException(notFoundMessage);
    }

    const isOwnerOrAdmin =
      user.role === UserRole.ADMIN || course.instructorId === user.sub;

    if (
      !isOwnerOrAdmin &&
      !(await this.enrollmentsService.hasActiveEnrollment(user.sub, course.id))
    ) {
      throw new ForbiddenException('Student enrollment required');
    }
  }

  // A unique index clash is a 409, not a 500.
  private async saveContentItem(contentItem: ContentItem): Promise<void> {
    try {
      await this.contentItemsRepository.save(contentItem);
    } catch (error) {
      if (isUniqueViolation(error, MEDIA_PUBLIC_ID_INDEX)) {
        throw new ConflictException(
          'This uploaded file is already used by another content item',
        );
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Another content item in this lesson already uses orderIndex ${contentItem.orderIndex}`,
        );
      }
      throw error;
    }
  }

  // An uploaded file replaces the link, so both cannot be sent, and text
  // content has no file.
  private assertMediaInput(contentType: ContentType, input: MediaInput): void {
    if (!input.mediaPublicId) {
      return;
    }

    if (!isMediaType(contentType)) {
      throw new BadRequestException(
        `mediaPublicId is not allowed for ${contentType} content`,
      );
    }

    if (input.videoUrl !== undefined || input.imageUrl !== undefined) {
      throw new BadRequestException(
        'Send either mediaPublicId or a link, not both',
      );
    }
  }

  // Checks the uploaded file, then points the item's link at it.
  private async attachUploadedMedia(
    contentItem: ContentItem,
    mediaPublicId: string,
  ): Promise<void> {
    const { contentType } = contentItem;

    // assertMediaInput already rejected text content.
    if (!isMediaType(contentType)) {
      return;
    }

    // The prefix proves the file was signed for this lesson.
    if (!mediaPublicId.startsWith(lessonMediaPrefix(contentItem.lessonId))) {
      throw new BadRequestException(
        'The uploaded file does not belong to this lesson',
      );
    }

    const resourceType = MEDIA_RESOURCE_TYPE[contentType];
    const asset = await this.cloudinaryService.getAssetDetails(
      mediaPublicId,
      resourceType,
    );

    assertValidAsset(asset, resourceType);

    contentItem[MEDIA_URL_FIELD[contentType]] = asset.secureUrl;
    contentItem.mediaPublicId = mediaPublicId;
  }

  // A new link or a type change means the stored file is no longer used.
  private leavesStoredMedia(
    dto: UpdateContentItemDto,
    oldContentType: ContentType,
  ): boolean {
    const typeChanged =
      dto.contentType !== undefined && dto.contentType !== oldContentType;

    return (
      typeChanged || dto.videoUrl !== undefined || dto.imageUrl !== undefined
    );
  }

  // The new data is already saved, so a failed cleanup only leaves an
  // unused file on Cloudinary and must not fail the request.
  private async deleteReplacedMedia(
    publicId: string,
    contentType: ContentType,
  ): Promise<void> {
    if (!isMediaType(contentType)) {
      return;
    }

    try {
      await this.cloudinaryService.deleteFile(
        publicId,
        MEDIA_RESOURCE_TYPE[contentType],
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete the replaced file ${publicId} from Cloudinary`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Checks the type's field is set, then keeps only the fields of the type.
  private applyTypeFields(contentItem: ContentItem): void {
    this.assertTypeField(contentItem.contentType, contentItem);
    Object.assign(
      contentItem,
      pickTypeFields(contentItem.contentType, contentItem),
    );

    if (!isMediaType(contentItem.contentType)) {
      contentItem.mediaPublicId = null;
    }
  }

  private async findContentItemEntity(id: string): Promise<ContentItem> {
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
    });

    if (!contentItem) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem;
  }

  private assertTypeField(
    contentType: ContentType,
    values: TypeFieldValues,
  ): void {
    const error = getTypeFieldError(contentType, values);

    if (error) {
      throw new BadRequestException(error);
    }
  }
}
