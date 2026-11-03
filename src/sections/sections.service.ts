import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import {
  assertOwnershipOrAdmin,
  canReadCourse,
} from '../common/authorization/authorization.util.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { getPaginationParams } from '../common/pagintion/pagination.util.js';
import { CoursesService } from '../courses/courses.service.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { Section } from './entities/section.entity.js';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    private readonly coursesService: CoursesService,
  ) {}

  async create(
    courseId: string,
    dto: CreateSectionDto,
    user: JwtPayload,
  ): Promise<Section> {
    const course = await this.coursesService.findById(courseId);

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

  async findById(id: string, user: JwtPayload): Promise<Section> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: {
        course: true,
      },
    });

    // The course is empty when it was soft deleted, because the join skips deleted rows.
    if (!section || !section.course || !canReadCourse(section.course, user)) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }

  async findByCourse(
    courseId: string,
    user: JwtPayload,
    paginationQuery: PaginationQueryDto,
  ): Promise<Section[]> {
    const course = await this.coursesService.findById(courseId);

    if (!canReadCourse(course, user)) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    const { skip, take } = getPaginationParams(paginationQuery);

    return this.sectionsRepository.find({
      where: { courseId },
      order: {
        orderIndex: 'ASC',
      },
      skip,
      take,
    });
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

  async findSectionWithCourse(id: string): Promise<Section> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: { course: true },
    });

    // The course is empty when it was soft deleted, because the join skips deleted rows.
    if (!section || !section.course) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }
}
