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
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
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
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new ForbiddenException('Only instructors can create courses');
    }

    const course = this.coursesRepository.create({
      title: createCourseDto.title,
      description: createCourseDto.description ?? null,
      instructorId: user.sub,
    });

    return this.coursesRepository.save(course);
  }

  async findAll(paginationQuery?: PaginationQueryDto): Promise<Course[]> {
    const { page, limit } = paginationQuery ?? {};
    const take = limit;
    const skip = page && limit ? (page - 1) * limit : undefined;

    return this.coursesRepository.find({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async update(
    id: string,
    updateCourseDto: UpdateCourseDto,
    user: JwtPayload,
  ): Promise<Course> {
    const course = await this.findById(id);

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner =
      user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to update this course',
      );
    }

    if (updateCourseDto.title !== undefined) {
      course.title = updateCourseDto.title;
    }

    if (updateCourseDto.description !== undefined) {
      course.description = updateCourseDto.description;
    }

    return this.coursesRepository.save(course);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const course = await this.findById(id);

    const isAdmin = user.role === UserRole.ADMIN;
    const isOwner =
      user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to delete this course',
      );
    }

    await this.coursesRepository.remove(course);
  }
}
