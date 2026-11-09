import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';

import type { AuthenticatedRequest } from '../../auth/types/authenticated-request.type.js';
import { assertOwnershipOrAdmin } from '../../common/authorization/authorization.util.js';
import { Lesson } from '../../lessons/entities/lesson.entity.js';
import { ContentItem } from '../entities/content-item.entity.js';

@Injectable()
export class ContentOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    @InjectRepository(ContentItem)
    private readonly contentItemsRepository: Repository<ContentItem>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { user } = request;
    const lessonId = request.params?.lessonId;
    const contentItemId = request.params?.id;

    if (!user) {
      return false;
    }

    // Guards run before pipes, so the ids are checked here.
    const instructorId =
      typeof lessonId === 'string'
        ? await this.findLessonOwner(lessonId)
        : await this.findContentItemOwner(contentItemId);

    // Only the course owner or an admin can change its content.
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      instructorId,
      'manage content in',
    );

    return true;
  }

  // Create: the owner of the lesson's course.
  private async findLessonOwner(lessonId: string): Promise<string> {
    if (!isUUID(lessonId)) {
      throw new BadRequestException('Invalid lesson ID');
    }

    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    // Deleting a section or course soft deletes its lessons, so a found lesson
    // has a section and a course.
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return lesson.section.course.instructorId;
  }

  // Update and delete: the owner of the content item's course.
  private async findContentItemOwner(id: unknown): Promise<string> {
    if (typeof id !== 'string' || !isUUID(id)) {
      throw new BadRequestException('Invalid content item ID');
    }

    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: { lesson: { section: { course: true } } },
    });

    // Deleting a lesson, section or course soft deletes its content items, so a
    // found item has a lesson, a section and a course.
    if (!contentItem) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem.lesson.section.course.instructorId;
  }
}
