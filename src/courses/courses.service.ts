import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import {
  getPaginationMeta,
  getPaginationParams,
  PaginatedResult,
} from '../common/pagintion/pagination.util.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { Course } from './entities/course.entity.js';

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
  ): Promise<Course> {
    await this.categoriesService.assertExists(createCourseDto.categoryId);

    // Fields left out take the entity defaults; new courses start as drafts.
    const course = this.coursesRepository.create({
      ...createCourseDto,
      instructorId,
    });

    return this.coursesRepository.save(course);
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<PaginatedResult<Course>> {
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

    return { items, meta: getPaginationMeta(total, page, limit) };
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
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

    // Preserve the course record instead of permanently deleting it.
    await this.coursesRepository.softRemove(course);
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
