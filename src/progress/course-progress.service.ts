
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { ContentProgress } from './entities/content-progress.entity.js';

@Injectable()
export class CourseProgressService {
  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    @InjectRepository(Enrollment)
    private readonly enrollmentsRepository: Repository<Enrollment>,
    @InjectRepository(ContentItem)
    private readonly contentsRepository: Repository<ContentItem>,
    @InjectRepository(ContentProgress)
    private readonly progressRepository: Repository<ContentProgress>,
  ) {}

  // Calculate progress from live content, not from an outdated cached percentage.
  private async calculate(
    enrollment: Enrollment,
    manager?: EntityManager,
  ) {
    const contentsRepository = manager
      ? manager.getRepository(ContentItem)
      : this.contentsRepository;

    const progressRepository = manager
      ? manager.getRepository(ContentProgress)
      : this.progressRepository;

    const contents = await contentsRepository.find({
      where: { courseId: enrollment.courseId },
      relations: { lesson: { section: true } },
    });

    // Ignore soft-deleted lessons, sections, and content items.
    const liveContents = contents.filter(
      (item) =>
        !item.deletedAt &&
        item.lesson &&
        !item.lesson.deletedAt &&
        item.lesson.section &&
        !item.lesson.section.deletedAt,
    );

    const contentIds = liveContents.map((item) => item.id);

    const completedRecords = contentIds.length
      ? await progressRepository.find({
          where: {
            enrollmentId: enrollment.id,
            contentItemId: In(contentIds),
            isCompleted: true,
          },
        })
      : [];

    const completedIds = new Set(
      completedRecords.map((item) => item.contentItemId),
    );

    // A lesson is complete only when it has content and every item is complete.
    const lessons = new Map<
      string,
      { total: number; completed: number }
    >();

    for (const item of liveContents) {
      const current = lessons.get(item.lessonId) ?? {
        total: 0,
        completed: 0,
      };

      current.total += 1;

      if (completedIds.has(item.id)) {
        current.completed += 1;
      }

      lessons.set(item.lessonId, current);
    }

    const lessonsCompleted = [...lessons.values()].filter(
      (lesson) =>
        lesson.total > 0 &&
        lesson.completed === lesson.total,
    ).length;

    const totalContents = liveContents.length;

    const completedContents = liveContents.filter(
      (item) => completedIds.has(item.id),
    ).length;

    const completionPercentage = totalContents
      ? Math.round((completedContents / totalContents) * 10000) / 100
      : 0;

    const isCompleted =
      totalContents > 0 &&
      completedContents === totalContents;

    return {
      courseId: enrollment.courseId,
      enrollmentId: enrollment.id,
      totalLessons: lessons.size,
      lessonsCompleted,
      totalContents,
      completedContents,
      completionPercentage,
      isCompleted,
    };
  }

  // Students can only read their own enrollment in a published course.
  async getCourseProgress(
    studentId: string,
    courseId: string,
  ) {
    const course = await this.coursesRepository.findOne({
      where: {
        id: courseId,
        isPublished: true,
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Course not found or unpublished',
      );
    }

    const enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId,
        courseId,
      },
    });

    if (!enrollment || enrollment.cancelledAt) {
      throw new ForbiddenException(
        'Student is not enrolled in this course',
      );
    }

    return this.calculate(enrollment);
  }

  // Refresh the stored enrollment summary after a content progress update.
  // When a manager is provided, use its repositories within the transaction.
  async refreshEnrollment(
    enrollmentId: string,
    courseId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const enrollmentsRepository = manager
      ? manager.getRepository(Enrollment)
      : this.enrollmentsRepository;

    const enrollment = await enrollmentsRepository.findOne({
      where: {
        id: enrollmentId,
        courseId,
      },
    });

    if (!enrollment || enrollment.cancelledAt) {
      return;
    }

    const summary = await this.calculate(enrollment, manager);

    const status = summary.isCompleted
      ? EnrollmentStatus.COMPLETED
      : summary.completedContents > 0
        ? EnrollmentStatus.IN_PROGRESS
        : EnrollmentStatus.NOT_STARTED;

    await enrollmentsRepository.update(
      { id: enrollment.id },
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
    );
  }
}
