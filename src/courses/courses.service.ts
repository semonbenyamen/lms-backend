import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import {
  assertAdminOrInstructor,
  assertOwnershipOrAdmin,
} from '../common/authorization/authorization.util.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { getPaginationParams } from '../common/pagintion/pagination.util.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { Course } from './entities/course.entity.js';

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
    assertAdminOrInstructor(user.role);

    const course = this.coursesRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description,
      category: createCourseDto.category,
      topics: createCourseDto.topics ?? [],
      difficulty: createCourseDto.difficulty ?? null,
      language: createCourseDto.language ?? 'en',
      prerequisites: createCourseDto.prerequisites ?? null,
      estimatedDuration: createCourseDto.estimatedDuration ?? null,

      // New courses start as drafts until publishing requirements are met.
      isPublished: false,

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

    // Show draft courses only to their owners and administrators.
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
      // Administrators can view all active courses.
    } else {
      queryBuilder.andWhere('course.isPublished = :isPublished', {
        isPublished: true,
      });
    }

    // TypeORM excludes soft-deleted courses from normal queries.
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
      user?.role === UserRole.INSTRUCTOR && course.instructorId === user.sub;

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

    // Apply the shared ownership and administrator authorization rules.
    assertOwnershipOrAdmin(user.role, user.sub, course.instructorId, 'update');

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

    return this.coursesRepository.save(course);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const course = await this.findCourseEntity(id);

    // Only the course owner or an administrator can delete the course.
    assertOwnershipOrAdmin(user.role, user.sub, course.instructorId, 'delete');

    // Preserve the course record instead of permanently deleting it.
    await this.coursesRepository.softRemove(course);
  }

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
}
