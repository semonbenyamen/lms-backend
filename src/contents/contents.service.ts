import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { canReadCourse } from '../common/authorization/authorization.util.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
import { ContentType } from '../common/enums/content-type.enum.js';
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

@Injectable()
export class ContentsService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly contentItemsRepository: Repository<ContentItem>,
    private readonly lessonsService: LessonsService,
    private readonly cloudinaryService: CloudinaryService,
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
    this.assertTypeField(dto.contentType, dto);

    const contentItem = this.contentItemsRepository.create({
      ...dto,
      lessonId,
      ...pickTypeFields(dto.contentType, dto),
    });

    await this.saveContentItem(contentItem);
  }

  async getContent(
    id: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItemResponseDto> {
    const contentItem = await this.findContentItemEntity(id);
    const lesson = await this.lessonsService.findLessonWithCourse(
      contentItem.lessonId,
    );

    // A draft course's content looks missing to users who cannot read it.
    if (!canReadCourse(lesson.section.course, user)) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return toContentItemResponseDto(contentItem);
  }

  async findByLesson(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItemResponseDto[]> {
    const lesson = await this.lessonsService.findLessonWithCourse(lessonId);

    if (!canReadCourse(lesson.section.course, user)) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

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

    // Apply only the fields provided in the update request.
    this.contentItemsRepository.merge(contentItem, dto);

    // The result must still match its type, e.g. a type change brings its field.
    this.assertTypeField(contentItem.contentType, contentItem);
    Object.assign(
      contentItem,
      pickTypeFields(contentItem.contentType, contentItem),
    );

    await this.saveContentItem(contentItem);
  }

  // Ownership is verified by ContentOwnershipGuard before this runs.
  async remove(id: string): Promise<void> {
    const contentItem = await this.findContentItemEntity(id);

    // Preserve the record instead of permanently deleting it.
    await this.contentItemsRepository.softRemove(contentItem);
  }

  // --- Helper Methods ---

  // order_index is unique per lesson, so a clash is a 409, not a 500.
  private async saveContentItem(contentItem: ContentItem): Promise<void> {
    try {
      await this.contentItemsRepository.save(contentItem);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Another content item in this lesson already uses orderIndex ${contentItem.orderIndex}`,
        );
      }
      throw error;
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
