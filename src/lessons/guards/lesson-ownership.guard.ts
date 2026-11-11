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
import { SectionsService } from '../../sections/sections.service.js';
import { Lesson } from '../entities/lesson.entity.js';

@Injectable()
export class LessonOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    private readonly sectionsService: SectionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;
    const sectionId = request.params?.sectionId;
    const lessonId = request.params?.id;

    if (!user) {
      return false;
    }

    let instructorId: string;

    if (typeof sectionId === 'string') {
      // Create: check ownership of the parent section's course.
      if (!isUUID(sectionId)) {
        throw new BadRequestException('Invalid section ID');
      }

      const section =
        await this.sectionsService.findSectionWithCourse(sectionId);
      instructorId = section.course.instructorId;
    } else if (typeof lessonId === 'string') {
      // Update/Delete: find the lesson and its course.
      if (!isUUID(lessonId)) {
        throw new BadRequestException('Invalid lesson ID');
      }

      const lesson = await this.lessonsRepository.findOne({
        where: { id: lessonId },
        relations: { section: { course: true } },
      });

      // Deleting a section or a course soft deletes its lessons, so a found
      // lesson has a section and a course.
      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      instructorId = lesson.section.course.instructorId;
    } else {
      throw new BadRequestException('Missing section or lesson ID');
    }

    // Only the course owner or an admin can modify lessons.
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      instructorId,
      'manage lessons in',
    );

    return true;
  }
}
