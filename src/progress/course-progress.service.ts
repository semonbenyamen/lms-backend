import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentsService } from '../contents/contents.service.js';
import { CoursesService } from '../courses/courses.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { CourseProgressResponseDto } from './dto/course-progress-response.dto.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { toCourseProgressResponseDto } from './transformers/course-progress-response.transformer.js';

export interface CourseProgressSummary {
  courseId: string;
  totalLessons: number;
  lessonsCompleted: number;
  totalContents: number;
  completedContents: number;
  completionPercentage: number;
  isCompleted: boolean;
}

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectRepository(ContentProgress)
    private readonly progressRepository: Repository<ContentProgress>,
    private readonly contentsService: ContentsService,
    private readonly coursesService: CoursesService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  // Students can only read their own enrollment in a published course.
  async getCourseProgress(
    studentId: string,
    courseId: string,
  ): Promise<CourseProgressResponseDto> {
    const enrollment = await this.enrollmentsService.findActiveEnrollment(
      studentId,
      courseId,
    );

    if (enrollment?.course.isPublished) {
      return toCourseProgressResponseDto(await this.calculate(enrollment));
    }

    // A draft or missing course is a 404, a published one without an
    // enrollment is a 403. This query only runs when the student is not in.
    const course = enrollment
      ? enrollment.course
      : await this.coursesService.findById(courseId);

    if (!course.isPublished) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    throw new ForbiddenException('Student is not enrolled in this course');
  }

  // Refresh the stored enrollment summary after a content progress update,
  // inside the same transaction. The enrollment is the locked row.
  async refreshEnrollment(
    enrollment: Enrollment,
    manager: EntityManager,
  ): Promise<void> {
    const summary = await this.calculate(enrollment, manager);

    const status = summary.isCompleted
      ? EnrollmentStatus.COMPLETED
      : summary.completedContents > 0
        ? EnrollmentStatus.IN_PROGRESS
        : EnrollmentStatus.NOT_STARTED;

    await this.enrollmentsService.updateProgressSummary(
      enrollment.id,
      {
        completionPercentage: summary.completionPercentage,
        lessonsCompleted: summary.lessonsCompleted,
        status,
        lastActivityAt: new Date(),

        // Preserve the first completion date if the course remains complete.
        completedAt: summary.isCompleted
          ? (enrollment.completedAt ?? new Date())
          : null,
      },
      manager,
    );
  }

  // Calculate progress from live content, not from an outdated cached percentage.
  // Deleting a section or lesson also deletes its content, so the live content
  // of the course is all that counts.
  private async calculate(
    enrollment: Enrollment,
    manager?: EntityManager,
  ): Promise<CourseProgressSummary> {
    const contents = await this.contentsService.findCourseContentLessons(
      enrollment.courseId,
      manager,
    );

    const progressRepository = manager
      ? manager.getRepository(ContentProgress)
      : this.progressRepository;

    const completedRecords = contents.length
      ? await progressRepository.find({
          select: { contentItemId: true },
          where: {
            enrollmentId: enrollment.id,
            contentItemId: In(contents.map((item) => item.id)),
            isCompleted: true,
          },
        })
      : [];

    const completedIds = new Set(
      completedRecords.map((item) => item.contentItemId),
    );

    // A lesson is complete only when it has content and every item is complete.
    const lessons = new Map<string, { total: number; completed: number }>();

    for (const item of contents) {
      const current = lessons.get(item.lessonId) ?? { total: 0, completed: 0 };

      current.total += 1;

      if (completedIds.has(item.id)) {
        current.completed += 1;
      }

      lessons.set(item.lessonId, current);
    }

    const lessonsCompleted = [...lessons.values()].filter(
      (lesson) => lesson.total > 0 && lesson.completed === lesson.total,
    ).length;

    const totalContents = contents.length;

    const completedContents = contents.filter((item) =>
      completedIds.has(item.id),
    ).length;

    const completionPercentage = totalContents
      ? Math.round((completedContents / totalContents) * 10000) / 100
      : 0;

    const isCompleted =
      totalContents > 0 && completedContents === totalContents;

    return {
      courseId: enrollment.courseId,
      totalLessons: lessons.size,
      lessonsCompleted,
      totalContents,
      completedContents,
      completionPercentage,
      isCompleted,
    };
  }
}
