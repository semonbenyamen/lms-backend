import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { getPaginationParams } from '../common/pagintion/pagination.util.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
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

  async create(
    lessonId: string,
    dto: CreateContentItemDto,
    user: JwtPayload,
  ): Promise<ContentItem> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson || !lesson.section || !lesson.section.course) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    this.assertOwnershipOrAdmin(
      lesson.section.course.instructorId,
      user,
      'create content in',
    );

    const contentItem = this.contentItemsRepository.create({
      lessonId,
      title: dto.title,
      contentType: dto.contentType,
      contentSubtype: dto.contentSubtype ?? null,
      bodyText: dto.bodyText ?? null,
      videoUrl: dto.videoUrl ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      language: dto.language ?? null,
      orderIndex: dto.orderIndex,
      tags: dto.tags ?? [],
    });

    return this.contentItemsRepository.save(contentItem);
  }

  async findById(id: string, user?: JwtPayload): Promise<ContentItem> {
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: {
        lesson: {
          section: {
            course: true,
          },
        },
      },
    });

    if (
      !contentItem ||
      !contentItem.lesson ||
      !contentItem.lesson.section ||
      !contentItem.lesson.section.course
    ) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    const course = contentItem.lesson.section.course;
    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR &&
        course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Content item with ID ${id} not found`);
      }
    } else if (!course.isPublished) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem;
  }

  async findByLesson(
    lessonId: string,
    user?: JwtPayload,
    paginationQuery?: PaginationQueryDto,
  ): Promise<ContentItem[]> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    if (!lesson || !lesson.section || !lesson.section.course) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const course = lesson.section.course;
    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR &&
        course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
      }
    } else if (!course.isPublished) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    const findOptions: FindManyOptions<ContentItem> = {
      where: { lessonId },
      order: { orderIndex: 'ASC' },
    };

    if (
      paginationQuery?.page !== undefined ||
      paginationQuery?.limit !== undefined
    ) {
      const { skip, take } = getPaginationParams(paginationQuery);
      findOptions.skip = skip;
      findOptions.take = take;
    }

    return this.contentItemsRepository.find(findOptions);
  }

  async update(
    id: string,
    dto: UpdateContentItemDto,
    user: JwtPayload,
  ): Promise<ContentItem> {
    const contentItem = await this.findContentItemWithCourse(id);
    this.assertOwnershipOrAdmin(
      contentItem.lesson.section.course.instructorId,
      user,
      'update',
    );

    if (dto.title !== undefined) {
      contentItem.title = dto.title;
    }
    if (dto.contentType !== undefined) {
      contentItem.contentType = dto.contentType;
    }
    if (dto.contentSubtype !== undefined) {
      contentItem.contentSubtype = dto.contentSubtype;
    }
    if (dto.bodyText !== undefined) {
      contentItem.bodyText = dto.bodyText;
    }
    if (dto.videoUrl !== undefined) {
      contentItem.videoUrl = dto.videoUrl;
    }
    if (dto.durationSeconds !== undefined) {
      contentItem.durationSeconds = dto.durationSeconds;
    }
    if (dto.language !== undefined) {
      contentItem.language = dto.language;
    }
    if (dto.orderIndex !== undefined) {
      contentItem.orderIndex = dto.orderIndex;
    }
    if (dto.tags !== undefined) {
      contentItem.tags = dto.tags;
    }

    return this.contentItemsRepository.save(contentItem);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const contentItem = await this.findContentItemWithCourse(id);
    this.assertOwnershipOrAdmin(
      contentItem.lesson.section.course.instructorId,
      user,
      'delete',
    );

    await this.contentItemsRepository.remove(contentItem);
  }

  private async findContentItemWithCourse(id: string): Promise<ContentItem> {
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: {
        lesson: {
          section: {
            course: true,
          },
        },
      },
    });

    if (
      !contentItem ||
      !contentItem.lesson ||
      !contentItem.lesson.section ||
      !contentItem.lesson.section.course
    ) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem;
  }

  private assertOwnershipOrAdmin(
    instructorId: string,
    user: JwtPayload,
    action: string,
  ): void {
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner =
      user.role === UserRole.INSTRUCTOR && instructorId === user.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        `You do not have permission to ${action} this content item`,
      );
    }
  }
}
