import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import { Repository } from 'typeorm';

import { AuthenticatedRequest } from '../../auth/types/authenticated-request.type.js';
import { UserRole } from '../../common/enums/user-role.enum.js';
import { Course } from '../entities/course.entity.js';

@Injectable()
export class CourseOwnershipGuard implements CanActivate {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the authenticated user and requested course ID.
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;
    const courseId = request.params?.id;

    // Guards run before ParseUUIDPipe, so a bad id must not reach the query.
    if (typeof courseId !== 'string' || !isUUID(courseId)) {
      throw new BadRequestException('Invalid course ID');
    }

    if (!user) {
      throw new ForbiddenException('Access denied');
    }

    // Admins can manage any course.
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Only instructors can manage their own courses.
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException('Access denied');
    }

    // Check course ownership in the database.
    const course = await this.coursesRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (course.instructorId !== user.sub) {
      throw new ForbiddenException('You do not own this course');
    }

    return true;
  }
}
