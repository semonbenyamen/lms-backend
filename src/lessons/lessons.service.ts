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
import { Section } from '../sections/entities/section.entity.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { Lesson } from './entities/lesson.entity.js';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
  ) {}

  async create(
    sectionId: string,
    dto: CreateLessonDto,
    user: JwtPayload,
  ): Promise<Lesson> {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: { course: true },
    });

    if (!section || !section.course) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      section.course.instructorId,
      'create lessons in',
    );

    const lesson = this.lessonsRepository.create({
      sectionId,
      title: dto.title,
      orderIndex: dto.orderIndex,
      topic: dto.topic ?? null,
      difficulty: dto.difficulty ?? null,
      prerequisites: dto.prerequisites ?? null,
    });

    return this.saveLesson(lesson);
  }

  async findById(id: string, user?: JwtPayload): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id },
      relations: {
        section: {
          course: true,
        },
      },
    });

    if (!lesson || !lesson.section || !lesson.section.course) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    // Publication visibility
    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR &&
        lesson.section.course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!lesson.section.course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Lesson with ID ${id} not found`);
      }
    } else if (!lesson.section.course.isPublished) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return lesson;
  }

  async findBySection(
    sectionId: string,
    user?: JwtPayload,
    paginationQuery?: PaginationQueryDto,
  ): Promise<Lesson[]> {
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId },
      relations: { course: true },
    });

    if (!section || !section.course) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    if (user) {
      const isOwner =
        user.role === UserRole.INSTRUCTOR &&
        section.course.instructorId === user.sub;
      const isAdmin = user.role === UserRole.ADMIN;

      if (!section.course.isPublished && !isOwner && !isAdmin) {
        throw new NotFoundException(`Section with ID ${sectionId} not found`);
      }
    } else if (!section.course.isPublished) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    const findOptions: FindManyOptions<Lesson> = {
      where: { sectionId },
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

    return this.lessonsRepository.find(findOptions);
  }

  // Alias for backward compatibility if needed
  async findByModule(
    sectionId: string,
    user?: JwtPayload,
    paginationQuery?: PaginationQueryDto,
  ): Promise<Lesson[]> {
    return this.findBySection(sectionId, user, paginationQuery);
  }

  async update(
    id: string,
    dto: UpdateLessonDto,
    user: JwtPayload,
  ): Promise<Lesson> {
    const lesson = await this.findLessonWithCourse(id);
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      lesson.section.course.instructorId,
      'update lessons in',
    );

    if (dto.title !== undefined) {
      lesson.title = dto.title;
    }
    if (dto.orderIndex !== undefined) {
      lesson.orderIndex = dto.orderIndex;
    }
    if (dto.topic !== undefined) {
      lesson.topic = dto.topic;
    }
    if (dto.difficulty !== undefined) {
      lesson.difficulty = dto.difficulty;
    }
    if (dto.prerequisites !== undefined) {
      lesson.prerequisites = dto.prerequisites;
    }

    return this.saveLesson(lesson);
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const lesson = await this.findLessonWithCourse(id);
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      lesson.section.course.instructorId,
      'delete lessons in',
    );

    await this.lessonsRepository.softRemove(lesson);
  }

  // --- Helper Methods ---

  // order_index is unique per section, so a clash is a 409, not a 500.
  private async saveLesson(lesson: Lesson): Promise<Lesson> {
    try {
      return await this.lessonsRepository.save(lesson);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          `Another lesson in this section already uses orderIndex ${lesson.orderIndex}`,
        );
      }
      throw error;
    }
  }

  private async findLessonWithCourse(id: string): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id },
      relations: { section: { course: true } },
    });

    if (!lesson || !lesson.section || !lesson.section.course) {
      throw new NotFoundException(`Lesson with ID ${id} not found`);
    }

    return lesson;
  }
}
