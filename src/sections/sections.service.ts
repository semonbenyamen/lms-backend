import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { canReadCourse } from '../common/authorization/authorization.util.js';
import { isUniqueViolation } from '../common/database/is-unique-violation.js';
import { CoursesService } from '../courses/courses.service.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { Section } from './entities/section.entity.js';
import { toSectionResponseDto } from './transformers/section-response.transformer.js';

// Only the user ID and role are needed for section permissions.
type SectionActor = Pick<JwtPayload, 'sub' | 'role'>;

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private readonly sectionsRepository: Repository<Section>,
    private readonly coursesService: CoursesService,
  ) {}

  async create(courseId: string, dto: CreateSectionDto): Promise<void> {
    // Ensure the parent course exists.
    await this.coursesService.findById(courseId);

    const section = this.sectionsRepository.create({
      courseId,
      title: dto.title,
      orderIndex: dto.orderIndex,
    });

    await this.saveSection(section);
  }

  async getSection(
    id: string,
    user: SectionActor,
  ): Promise<SectionResponseDto> {
    const section = await this.sectionsRepository.findOne({
      where: { id },
      relations: {
        course: true,
      },
    });

    // Deleting a course soft deletes its sections, so a found section has a course.
    if (!section || !canReadCourse(section.course, user)) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return toSectionResponseDto(section);
  }

  async findByCourse(
    courseId: string,
    user: SectionActor,
  ): Promise<SectionResponseDto[]> {
    // Check that the course exists.
    const course = await this.coursesService.findById(courseId);

    // Allow access only if the user can view the course.
    if (!canReadCourse(course, user)) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    // Get all sections ordered by their position.
    const sections = await this.sectionsRepository.find({
      where: { courseId },
      order: {
        orderIndex: 'ASC',
      },
    });

    // Transform each section into a response DTO.
    return sections.map(toSectionResponseDto);
  }

  async update(id: string, dto: UpdateSectionDto): Promise<void> {
    const section = await this.findSectionWithCourse(id);

    // Apply only the fields provided in the update request.
    this.sectionsRepository.merge(section, dto);

    await this.saveSection(section);
  }

  async remove(id: string): Promise<void> {
    const section = await this.findSectionWithCourse(id);

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
      relations: {
        course: true,
      },
    });

    // Deleting a course soft deletes its sections, so no course check is needed.
    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }

    return section;
  }
}
