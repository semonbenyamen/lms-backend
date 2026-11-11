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
import { LessonsService } from '../../lessons/lessons.service.js';
import { ContentItem } from '../entities/content-item.entity.js';

@Injectable()
export class ContentOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(ContentItem)
    private readonly contentItemsRepository: Repository<ContentItem>,
    private readonly lessonsService: LessonsService,
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

    const lesson = await this.lessonsService.findLessonWithCourse(lessonId);

    return lesson.section.course.instructorId;
  }

  // Update and delete: the owner of the content item's course.
  private async findContentItemOwner(id: unknown): Promise<string> {
    if (typeof id !== 'string' || !isUUID(id)) {
      throw new BadRequestException('Invalid content item ID');
    }

    // The item keeps its course id, so the course comes in the same query.
    const contentItem = await this.contentItemsRepository.findOne({
      where: { id },
      relations: { course: true },
    });

    if (!contentItem) {
      throw new NotFoundException(`Content item with ID ${id} not found`);
    }

    return contentItem.course.instructorId;
  }
}
