import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { canReadCourse } from '../common/authorization/authorization.util.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { SectionsService } from '../sections/sections.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { Lesson } from './entities/lesson.entity.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { toLessonResponseDto } from './transformers/lesson-response.transformer.js';

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private readonly lessonsRepository: Repository<Lesson>,
    private readonly sectionsService: SectionsService,
  ) {}

  // Ownership is checked by LessonOwnershipGuard before this method runs.
  async create(sectionId: string, dto: CreateLessonDto): Promise<void> {
    const lesson = this.lessonsRepository.create({
      sectionId,
      title: dto.title,
      orderIndex: dto.orderIndex,
    });

    await this.saveLesson(lesson);
  }

  async getLesson(
    lessonId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<LessonResponseDto> {
    // Only the lesson details load its content items.
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true }, contentItems: true },
      order: { contentItems: { orderIndex: 'ASC' } },
    });

    if (!lesson || !canReadCourse(lesson.section.course, user)) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return toLessonResponseDto(lesson);
  }

  async findBySection(
    sectionId: string,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<LessonResponseDto[]> {
    const section = await this.sectionsService.findSectionWithCourse(sectionId);

    // Check if the user can view the course.
    if (!canReadCourse(section.course, user)) {
      throw new NotFoundException(`Section with ID ${sectionId} not found`);
    }

    // Get all active lessons ordered by their position.
    const lessons = await this.lessonsRepository.find({
      where: { sectionId },
      relations: { contentItems: true },
      order: {
        orderIndex: 'ASC',
        contentItems: {
          orderIndex: 'ASC',
        },
      },
    });

    return lessons.map(toLessonResponseDto);
  }

  async update(lessonId: string, dto: UpdateLessonDto): Promise<void> {
    const lesson = await this.findLessonWithCourse(lessonId);

    // Apply only the fields provided in the update request.
    this.lessonsRepository.merge(lesson, dto);

    await this.saveLesson(lesson);
  }

  async remove(lessonId: string): Promise<void> {
    const lesson = await this.findLessonWithCourse(lessonId);

    // Soft delete the lesson and its content together, like a section delete.
    await this.lessonsRepository.manager.transaction(async (manager) => {
      await manager.softDelete(ContentItem, { lessonId, deletedAt: IsNull() });
      await manager.softRemove(Lesson, lesson);
    });
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

  // Used by ContentsService and ContentOwnershipGuard to reach the course.
  async findLessonWithCourse(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonsRepository.findOne({
      where: { id: lessonId },
      relations: { section: { course: true } },
    });

    // Deleting a section or a course soft deletes its lessons, so a found
    // lesson has a section and a course.
    if (!lesson) {
      throw new NotFoundException(`Lesson with ID ${lessonId} not found`);
    }

    return lesson;
  }
}
