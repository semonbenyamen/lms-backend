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
import { CoursesService } from '../../courses/courses.service.js';
import { Section } from '../entities/section.entity.js';

@Injectable()
export class SectionOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    private readonly coursesService: CoursesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;
    const courseId = request.params?.courseId;
    const sectionId = request.params?.id;

    if (!user) {
      return false;
    }

    let instructorId: string;

    if (typeof courseId === 'string') {
      // Create: check ownership of the parent course.
      if (!isUUID(courseId)) {
        throw new BadRequestException('Invalid course ID');
      }

      const course = await this.coursesService.findById(courseId);
      instructorId = course.instructorId;
    } else if (typeof sectionId === 'string') {
      // Update/Delete: find the section and its parent course.
      if (!isUUID(sectionId)) {
        throw new BadRequestException('Invalid section ID');
      }

      const section = await this.sectionsRepository.findOne({
        where: { id: sectionId },
        relations: { course: true },
      });

      // Deleting a course soft deletes its sections, so a found section has a course.
      if (!section) {
        throw new NotFoundException('Section not found');
      }

      instructorId = section.course.instructorId;
    } else {
      throw new BadRequestException('Missing course or section ID');
    }

    // Only the course owner or an admin can modify sections.
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      instructorId,
      'manage sections in',
    );

    return true;
  }
}
