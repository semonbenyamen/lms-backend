import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import {
  getPaginationMeta,
  getPaginationParams,
  PaginatedResult,
} from '../common/pagintion/pagination.util.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { softDeleteSectionLessons } from '../lessons/soft-delete-section-lessons.js';
import { Section } from '../sections/entities/section.entity.js';
import { Course } from './entities/course.entity.js';
import { toCourseResponseDto } from './transformers/course-response.transformer.js';

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    instructorId: string,
  ): Promise<IdResponseDto> {
    await this.categoriesService.assertExists(createCourseDto.categoryId);

    // Fields left out take the entity defaults; new courses start as drafts.
    const course = this.coursesRepository.create({
      ...createCourseDto,
      instructorId,
    });

    const { id } = await this.coursesRepository.save(course);

    // The frontend opens the new course page with this id.
    return { id };
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    const { page, limit, skip, take } = getPaginationParams(paginationQuery);

    const queryBuilder = this.courseWithCategoryQuery()
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    // Administrators see all courses, instructors only their own.
    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('course.instructorId = :instructorId', {
        instructorId: user.sub,
      });
    }

    // TypeORM excludes soft-deleted courses from normal queries.
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map(toCourseResponseDto),
      meta: getPaginationMeta(total, page, limit),
    };
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async getCourse(id: string): Promise<CourseResponseDto> {
    return toCourseResponseDto(await this.findById(id));
  }

  // Returns the entity, because other services need fields the response hides.
  async findById(id: string): Promise<Course> {
    const course = await this.courseWithCategoryQuery()
      .where('course.id = :id', { id })
      .getOne();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<void> {
    const course = await this.findCourseEntity(id);

    if (updateCourseDto.categoryId) {
      await this.categoriesService.assertExists(updateCourseDto.categoryId);
    }

    // Apply only the fields provided in the update request.
    await this.coursesRepository.save(
      this.coursesRepository.merge(course, updateCourseDto),
    );
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async remove(id: string): Promise<void> {
    const course = await this.findCourseEntity(id);

    // Soft delete the course with its sections, lessons and content together,
    // so a child is never left without a parent and its checks only need itself.
    await this.coursesRepository.manager.transaction(async (manager) => {
      const sections = await manager.find(Section, {
        where: { courseId: id },
        select: { id: true },
      });

      await softDeleteSectionLessons(
        manager,
        sections.map((section) => section.id),
      );
      await manager.softDelete(Section, { courseId: id, deletedAt: IsNull() });
      await manager.softRemove(Course, course);
    });
  }

  // --- Helper Methods ---

  // Categories are paginated, so a course brings the name it needs with it.
  private courseWithCategoryQuery() {
    return this.coursesRepository
      .createQueryBuilder('course')
      .leftJoin('course.category', 'category')
      .addSelect(['category.id', 'category.name']);
  }

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
