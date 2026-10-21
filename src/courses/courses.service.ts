import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js'
import { Course } from './entities/course.entity.js';
import { assertAdminOrInstructor } from '../common/authorization/authorization.util.js';
import { getPaginationParams } from '../common/pagintion/pagination.util.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
   
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    user: JwtPayload,
  ): Promise<Course> {
    assertAdminOrInstructor(user.role)

    const course = this.coursesRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      category: createCourseDto.category,
      topics: createCourseDto.topics ?? [],
      difficulty: createCourseDto.difficulty ?? null,
      language: createCourseDto.language ?? 'en',
      prerequisites: createCourseDto.prerequisites ?? null,
      estimatedDuration: createCourseDto.estimatedDuration ?? null,
      isPublished: createCourseDto.isPublished ?? false,
      instructorId: user.sub,
    });

    return this.coursesRepository.save(course);
  }

  async findAll(
    paginationQuery?: PaginationQueryDto,
    user?: JwtPayload,
  ): Promise<Course[]> {
    const { skip, take } = getPaginationParams(paginationQuery);

    const queryBuilder = this.coursesRepository
      .createQueryBuilder('course')
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    // Publication and role visibility
    if (user) {
      if (user.role === UserRole.STUDENT) {
        queryBuilder.andWhere('course.isPublished = :isPublished', {
          isPublished: true,
        });
      } else if (user.role === UserRole.INSTRUCTOR) {
        queryBuilder.andWhere(
          '(course.isPublished = :isPublished OR course.instructorId = :instructorId)',
          { isPublished: true, instructorId: user.sub },
        );
      }
      // ADMIN sees all courses
    } else {
      queryBuilder.andWhere('course.isPublished = :isPublished', {
        isPublished: true,
      });
    }

    return queryBuilder.getMany();
  }

  async findById(id: string, user?: JwtPayload): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
    });

  if (!course) {
    throw new NotFoundException(`Course with ID ${id} not found`);
  }

  const isOwner =
    user?.role === UserRole.INSTRUCTOR &&
    course.instructorId === user.sub;

  const isAdmin = user?.role === UserRole.ADMIN;

  if (!course.isPublished && !isOwner && !isAdmin) {
    throw new NotFoundException(`Course with ID ${id} not found`);
  }

  return course;
}

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    user: JwtPayload,
  ): Promise<Course> {
    const course = await this.findCourseEntity(id);
    this.assertOwnershipOrAdmin(course, user, 'update');

    if (updateCourseDto.title !== undefined) {
      course.title = updateCourseDto.title;
    }
    if (updateCourseDto.description !== undefined) {
      course.description = updateCourseDto.description;
    }
    if (updateCourseDto.category !== undefined) {
      course.category = updateCourseDto.category;
    }
    if (updateCourseDto.topics !== undefined) {
      course.topics = updateCourseDto.topics;
    }
    if (updateCourseDto.difficulty !== undefined) {
      course.difficulty = updateCourseDto.difficulty;
    }
    if (updateCourseDto.language !== undefined) {
      course.language = updateCourseDto.language;
    }
    if (updateCourseDto.prerequisites !== undefined) {
      course.prerequisites = updateCourseDto.prerequisites;
    }
    if (updateCourseDto.estimatedDuration !== undefined) {
      course.estimatedDuration = updateCourseDto.estimatedDuration;
    }
    if (updateCourseDto.isPublished !== undefined) {
      course.isPublished = updateCourseDto.isPublished;
    }

    return this.coursesRepository.save(course);
  }

  async remove(id: string, user: JwtPayload): Promise<string> {
    const course = await this.findCourseEntity(id);
    this.assertOwnershipOrAdmin(course, user, 'delete');

    await this.coursesRepository.remove(course);
    return `course ${course.title} is deleted; `
  }

  // --- Module / Section Operations ---

  // --- Helper Methods ---

  private async findCourseEntity(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  private assertOwnershipOrAdmin(
    course: Course,
    user: JwtPayload,
    action: string,
  ): void {
    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner =
      user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        `You do not have permission to ${action} this course`,
      );
    }
  }

  
}
