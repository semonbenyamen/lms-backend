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
import { SectionsService } from '../sections/sections.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { Lesson } from './entities/lesson.entity.js';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    private readonly sectionsService: SectionsService,
  ) {}

  async create(
    sectionId: string,
    dto: CreateLessonDto,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<Lesson> {
    const section = await this.sectionsService.findSectionWithCourse(sectionId);

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

  async findById(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<Lesson> {
    const lesson = await this.findLessonWithCourse(lessonId);

    if (!canReadCourse(lesson.section.course, user)) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return lesson;
  }

  async findBySection(
    sectionId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<Lesson[]> {
    const section = await this.sectionsService.findSectionWithCourse(sectionId);

    // Check if the user can view the course.
    if (!canReadCourse(section.course, user)) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Return all active lessons ordered by their position.
    return this.lessonsRepository.find({
      where: { sectionId },
      order: {
        orderIndex: 'ASC',
      },
    });
  }

  async update(
    lessonId: string,
    dto: UpdateLessonDto,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<Lesson> {
    const lesson = await this.findLessonWithCourse(lessonId);
    assertOwnershipOrAdmin(
      user.role,
      user.sub,
      lesson.section.course.instructorId,
      'update lessons in',
    );

    // Apply only the fields provided in the update request.
    this.lessonsRepository.merge(lesson, dto);

    return this.saveLesson(lesson);
  }

  async remove(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<void> {
    const lesson = await this.findLessonWithCourse(lessonId);
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

  private async findLessonWithCourse(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    // The joins come back empty when the section or the course was soft deleted.
    if (!lesson || !lesson.section || !lesson.section.course) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return lesson;
  }
}
