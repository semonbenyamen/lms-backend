import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { assertOwnershipOrAdmin } from '../common/authorization/authorization.util.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { getPaginationParams } from '../common/pagintion/pagination.util.js';
import { Course } from '../courses/entities/course.entity.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { Section } from './entities/section.entity.js';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async create(
    courseId: string,
    dto: CreateSectionDto,
    user: JwtPayload,
  ): Promise<Section> {
    const course = await this.coursesRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      course.instructorId,
      'create sections in',
    );

    const section = this.sectionsRepository.create({
      courseId,
      title: dto.title,
      orderIndex: dto.orderIndex,
    });

    return this.saveSection(section);
  }

  async findById(id: string, user?: JwtPayload): Promise<Section> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: {
        course: true,
      },
    });

    if (!section || !section.course) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR &&
        section.course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!section.course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Section with ID ${id} not found`);
      }
    } else if (!section.course.isPublished) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async findByCourse(
    courseId: string,
    user?: JwtPayload,
    paginationQuery?: PaginationQueryDto,
  ): Promise<Section[]> {
    const course = await this.coursesRepository.findOne({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Course with ID ${courseId} not found`);
      }
    } else if (!course.isPublished) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const findOptions: FindManyOptions<Section> = {
      where: { courseId },
      order: {
        orderIndex: 'ASC',
      },
    };

    if (
      paginationQuery?.page !== undefined ||
      paginationQuery?.limit !== undefined
    ) {
      const { skip, take } = getPaginationParams(paginationQuery);
      findOptions.skip = skip;
      findOptions.take = take;
    }

    return this.sectionsRepository.find(findOptions);
  }

  async update(
    id: string,
    dto: UpdateSectionDto,
    user: JwtPayload,
  ): Promise<Section> {
    const section = await this.findSectionWithCourse(id);
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      section.course.instructorId,
      'update sections in',
    );

    if (dto.title !== undefined) {
      section.title = dto.title;
    }
    if (dto.orderIndex !== undefined) {
      section.orderIndex = dto.orderIndex;
    }

    return this.saveSection(section);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const section = await this.findSectionWithCourse(id);
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      section.course.instructorId,
      'delete sections in',
    );

    await this.sectionsRepository.softRemove(section);
  }

  // order_index is unique per course, so a clash is a 409, not a 500.
  private async saveSection(section: Section): Promise<Section> {
    try {
      return await this.sectionsRepository.save(section);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Another section in this course already uses orderIndex ${section.orderIndex}`,
        );
      }
      throw error;
    }
  }

  private async findSectionWithCourse(id: string): Promise<Section> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: { course: true },
    });

    if (!section || !section.course) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }
}
