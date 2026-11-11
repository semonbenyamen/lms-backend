import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ContentType } from '../common/enums/content-type.enum.js';
import {
  ContentsService,
  ProgressContentReference,
} from '../contents/contents.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { CoursesService } from '../courses/courses.service.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { ContentProgressResponseDto } from './dto/content-progress-response.dto.js';
import { UpdateContentProgressDto } from './dto/update-content-progress.dto.js';
import { ContentProgressHistory } from './entities/content-progress-history.entity.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { toContentProgressResponseDto } from './transformers/content-progress-response.transformer.js';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ContentProgress)
    private readonly progressRepository: Repository<ContentProgress>,
    private readonly contentsService: ContentsService,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly coursesService: CoursesService,
    private readonly dataSource: DataSource,
  ) {}

  // Missing or deleted content is a 404, existing content without an
  // enrollment is a 403. Content metadata is still not loaded here.
  private async findEnrollmentOrFail(
    studentId: string,
    contentId: string,
  ): Promise<Enrollment> {
    const enrollment =
      await this.enrollmentsService.findActiveEnrollmentByContent(
        studentId,
        contentId,
      );

    if (enrollment) {
      return enrollment;
    }

    if (!(await this.contentsService.contentExists(contentId))) {
      throw new NotFoundException(
        `Content item with ID ${contentId} not found`,
      );
    }

    throw new ForbiddenException('Student is not enrolled in this course');
  }

  // Only enrolled students can access progress for published content.
  private async getAccess(
    studentId: string,
    contentId: string,
  ): Promise<{
    content: ProgressContentReference;
    enrollment: Enrollment;
  }> {
    // Check enrollment before loading content metadata.
    const enrollment = await this.findEnrollmentOrFail(studentId, contentId);

    // Load minimal metadata only after enrollment is confirmed.
    const content =
      await this.contentsService.findProgressContentReference(contentId);

    // Verify that the course is published.
    await this.coursesService.findPublishedById(content.courseId);

    return { content, enrollment };
  }

  // Return progress only for actively enrolled students in published courses.
  async getProgress(
    studentId: string,
    contentId: string,
  ): Promise<ContentProgressResponseDto> {
    const enrollment = await this.findEnrollmentOrFail(studentId, contentId);

    // Verify course publication without fetching content metadata.
    await this.coursesService.findPublishedById(enrollment.courseId);

    const progress = await this.progressRepository.findOne({
      where: {
        enrollmentId: enrollment.id,
        contentItemId: contentId,
      },
    });

    return toContentProgressResponseDto(contentId, progress);
  }

  // Ensure the request contains at least one progress field.
  private validateProgressRequest(dto: UpdateContentProgressDto): void {
    if (
      dto.isCompleted === undefined &&
      dto.lastPositionSeconds === undefined
    ) {
      throw new BadRequestException('Provide completion or video position');
    }
  }

  // Validate playback position against content type and video duration.
  private validateVideoPosition(
    dto: UpdateContentProgressDto,
    contentType: ContentType,
    durationSeconds: number | null,
  ): void {
    if (dto.lastPositionSeconds === undefined) {
      return;
    }

    if (contentType !== ContentType.VIDEO) {
      throw new BadRequestException('Playback position is only for videos');
    }

    if (durationSeconds !== null && dto.lastPositionSeconds > durationSeconds) {
      throw new BadRequestException('Position exceeds video duration');
    }
  }

  // Save the current progress and append history atomically.
  private async saveProgressWithHistory(
    enrollmentId: string,
    contentId: string,
    dto: UpdateContentProgressDto,
  ): Promise<ContentProgress> {
    return this.dataSource.transaction(async (manager) => {
      const progressRepository = manager.getRepository(ContentProgress);
      const historyRepository = manager.getRepository(ContentProgressHistory);

      // Updates of one student run one after another, so two parallel
      // requests cannot both read the old row and save a lower position.
      await this.enrollmentsService.lockEnrollment(enrollmentId, manager);

      const current = await progressRepository.findOne({
        where: {
          enrollmentId,
          contentItemId: contentId,
        },
      });

      const completed =
        current?.isCompleted === true || dto.isCompleted === true;

      const position = Math.max(
        current?.lastPositionSeconds ?? 0,
        dto.lastPositionSeconds ?? 0,
      );

      await progressRepository.upsert(
        {
          enrollmentId,
          contentItemId: contentId,
          isCompleted: completed,
          lastPositionSeconds: position,
          completedAt: completed ? (current?.completedAt ?? new Date()) : null,
        },
        ['enrollmentId', 'contentItemId'],
      );

      // Append a new history record for every progress update.
      await historyRepository.insert({
        enrollmentId,
        contentItemId: contentId,
        isCompleted: completed,
        lastPositionSeconds: dto.lastPositionSeconds ?? null,
      });

      return progressRepository.findOneOrFail({
        where: {
          enrollmentId,
          contentItemId: contentId,
        },
      });
    });
  }

  // Validate access and delegate progress persistence.
  async updateStudentContentProgress(
    studentId: string,
    contentId: string,
    dto: UpdateContentProgressDto,
  ): Promise<ContentProgressResponseDto> {
    this.validateProgressRequest(dto);

    const { content, enrollment } = await this.getAccess(studentId, contentId);

    this.validateVideoPosition(
      dto,
      content.contentType,
      content.durationSeconds,
    );

    const progress = await this.saveProgressWithHistory(
      enrollment.id,
      contentId,
      dto,
    );

    return toContentProgressResponseDto(contentId, progress);
  }
}
