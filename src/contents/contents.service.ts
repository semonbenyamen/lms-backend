import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { canReadCourse } from '../common/authorization/authorization.util.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { ContentType } from '../common/enums/content-type.enum.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import {
  getTypeFieldError,
  pickTypeFields,
  TypeFieldValues,
} from './content-type-fields.js';
import { CreateContentItemDto } from './dto/create-content-item.dto.js';
import { UpdateContentItemDto } from './dto/update-content-item.dto.js';
import { ContentItem } from './entities/content-item.entity.js';

@Injectable()
export class ContentsService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly contentItemsRepository: Repository<ContentItem>,
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
  ) {}

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

  async findById(
    id: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItem> {
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: { lesson: { section: { course: true } } },
    });

    // A draft course's content looks missing to users who cannot read it.
    const course = contentItem?.lesson?.section?.course;
    if (!contentItem || !course || !canReadCourse(course, user)) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem;
  }

  async findByLesson(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<ContentItem[]> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    const course = lesson?.section?.course;
    if (!course || !canReadCourse(course, user)) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    // A lesson has few items, so they are returned in one ordered list.
    return this.contentItemsRepository.find({
      where: { lessonId },
      order: { orderIndex: 'ASC' },
    });
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
