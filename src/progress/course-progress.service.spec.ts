import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EntityManager, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentsService } from '../contents/contents.service.js';
import { CoursesService } from '../courses/courses.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import type { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { CourseProgressService } from './course-progress.service.js';
import { ContentProgress } from './entities/content-progress.entity.js';

describe('CourseProgressService', () => {
  const courseId = 'course-1';
  const studentId = 'student-1';
  const enrollment = {
    id: 'enrollment-1',
    studentId,
    courseId,
    cancelledAt: null,
    completedAt: null,
    course: { id: courseId, isPublished: true },
  } as unknown as Enrollment;
  const content = (id: string, lessonId: string) => ({ id, lessonId });

  const progress = { find: vi.fn(), createQueryBuilder: vi.fn() };
  const completedQuery = {
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    getRawMany: vi.fn(),
  };
  const contentsService = {
    findCourseContentLessons: vi.fn(),
    countCourseContents: vi.fn(),
  };
  const coursesService = { findById: vi.fn() };
  const enrollmentsService = {
    findActiveEnrollment: vi.fn(),
    updateProgressSummary: vi.fn(),
    findStudentEnrollments: vi.fn(),
  };
  const manager = {
    getRepository: vi.fn(() => progress),
  } as unknown as EntityManager;
  let service: CourseProgressService;

  beforeEach(() => {
    vi.clearAllMocks();
    progress.createQueryBuilder.mockReturnValue(completedQuery);
    enrollmentsService.findActiveEnrollment.mockResolvedValue(enrollment);
    contentsService.findCourseContentLessons.mockResolvedValue([
      content('a', 'lesson-1'),
      content('b', 'lesson-1'),
      content('c', 'lesson-2'),
    ]);
    progress.find.mockResolvedValue([
      { contentItemId: 'a' },
      { contentItemId: 'b' },
    ]);
    service = new CourseProgressService(
      progress as unknown as Repository<ContentProgress>,
      contentsService as unknown as ContentsService,
      coursesService as unknown as CoursesService,
      enrollmentsService as unknown as EnrollmentsService,
    );
  });

  describe('getCourseProgress', () => {
    it('calculates percentage and counts completed lessons', async () => {
      await expect(
        service.getCourseProgress(studentId, courseId),
      ).resolves.toEqual({
        courseId,
        totalLessons: 2,
        lessonsCompleted: 1,
        totalContents: 3,
        completedContents: 2,
        completedContentIds: ['a', 'b'],
        completionPercentage: 66.67,
        isCompleted: false,
      });
    });

    it('reads the live content of the course and only its completed items', async () => {
      await service.getCourseProgress(studentId, courseId);

      expect(contentsService.findCourseContentLessons).toHaveBeenCalledWith(
        courseId,
        undefined,
      );
      expect(progress.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            enrollmentId: enrollment.id,
            isCompleted: true,
          }),
        }),
      );
    });

    it('does not complete an empty course', async () => {
      contentsService.findCourseContentLessons.mockResolvedValue([]);

      const result = await service.getCourseProgress(studentId, courseId);

      expect(result.completionPercentage).toBe(0);
      expect(result.isCompleted).toBe(false);
      expect(progress.find).not.toHaveBeenCalled();
    });

    it('rejects a student who is not enrolled in a published course', async () => {
      enrollmentsService.findActiveEnrollment.mockResolvedValue(null);
      coursesService.findById.mockResolvedValue({
        id: courseId,
        isPublished: true,
      });

      await expect(
        service.getCourseProgress(studentId, courseId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('hides an unpublished course from a student who is not enrolled', async () => {
      enrollmentsService.findActiveEnrollment.mockResolvedValue(null);
      coursesService.findById.mockResolvedValue({
        id: courseId,
        isPublished: false,
      });

      await expect(
        service.getCourseProgress(studentId, courseId),
      ).rejects.toThrow(NotFoundException);
    });

    it('hides an unpublished course from an enrolled student without another query', async () => {
      enrollmentsService.findActiveEnrollment.mockResolvedValue({
        ...enrollment,
        course: { id: courseId, isPublished: false },
      });

      await expect(
        service.getCourseProgress(studentId, courseId),
      ).rejects.toThrow(NotFoundException);
      expect(coursesService.findById).not.toHaveBeenCalled();
      expect(contentsService.findCourseContentLessons).not.toHaveBeenCalled();
    });

    it('returns 404 for a missing course', async () => {
      enrollmentsService.findActiveEnrollment.mockResolvedValue(null);
      coursesService.findById.mockRejectedValue(new NotFoundException());

      await expect(
        service.getCourseProgress(studentId, courseId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyEnrollments', () => {
    const course = (id: string, isPublished = true) => ({
      id,
      title: `Course ${id}`,
      thumbnailUrl: null,
      isPublished,
    });
    const enrolledAt = new Date('2026-11-01T10:00:00.000Z');
    const myEnrollment = (
      id: string,
      courseIdValue: string,
      isPublished = true,
    ) =>
      ({
        id,
        courseId: courseIdValue,
        status: EnrollmentStatus.NOT_STARTED,
        completionPercentage: 0,
        lastActivityAt: null,
        enrolledAt,
        course: course(courseIdValue, isPublished),
      }) as unknown as Enrollment;

    it('calculates the live progress of every course on the page', async () => {
      enrollmentsService.findStudentEnrollments.mockResolvedValue([
        [
          myEnrollment('e-1', 'c-1'),
          myEnrollment('e-2', 'c-2', false),
          myEnrollment('e-3', 'c-3'),
        ],
        13,
      ]);
      contentsService.countCourseContents.mockResolvedValue(
        new Map([
          ['c-1', 3],
          ['c-2', 4],
        ]),
      );
      completedQuery.getRawMany.mockResolvedValue([
        { enrollmentId: 'e-1', completed: '3' },
        { enrollmentId: 'e-2', completed: '1' },
      ]);

      const result = await service.findMyEnrollments(studentId, {
        page: 2,
        limit: 10,
      });

      expect(enrollmentsService.findStudentEnrollments).toHaveBeenCalledWith(
        studentId,
        10,
        10,
      );
      expect(contentsService.countCourseContents).toHaveBeenCalledWith([
        'c-1',
        'c-2',
        'c-3',
      ]);
      expect(completedQuery.where).toHaveBeenCalledWith(
        'progress.enrollmentId IN (:...enrollmentIds)',
        { enrollmentIds: ['e-1', 'e-2', 'e-3'] },
      );
      expect(result.items).toEqual([
        {
          id: 'e-1',
          status: EnrollmentStatus.COMPLETED,
          completionPercentage: 100,
          lastActivityAt: null,
          enrolledAt,
          course: course('c-1'),
        },
        {
          id: 'e-2',
          status: EnrollmentStatus.IN_PROGRESS,
          completionPercentage: 25,
          lastActivityAt: null,
          enrolledAt,
          course: course('c-2', false),
        },
        {
          // A course without content is not started, not completed.
          id: 'e-3',
          status: EnrollmentStatus.NOT_STARTED,
          completionPercentage: 0,
          lastActivityAt: null,
          enrolledAt,
          course: course('c-3'),
        },
      ]);
      expect(result.meta).toEqual(
        expect.objectContaining({ total: 13, page: 2, limit: 10 }),
      );
    });

    it('does not count progress for an empty page', async () => {
      enrollmentsService.findStudentEnrollments.mockResolvedValue([[], 0]);
      contentsService.countCourseContents.mockResolvedValue(new Map());

      const result = await service.findMyEnrollments(studentId, {});

      expect(result.items).toEqual([]);
      expect(progress.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('refreshEnrollment', () => {
    it('updates the enrollment with in-progress totals', async () => {
      await service.refreshEnrollment(enrollment, manager);

      expect(contentsService.findCourseContentLessons).toHaveBeenCalledWith(
        courseId,
        manager,
      );
      expect(enrollmentsService.updateProgressSummary).toHaveBeenCalledWith(
        enrollment.id,
        expect.objectContaining({
          completionPercentage: 66.67,
          lessonsCompleted: 1,
          status: EnrollmentStatus.IN_PROGRESS,
          lastActivityAt: expect.any(Date),
          completedAt: null,
        }),
        manager,
      );
    });

    it('marks a fully completed course as completed', async () => {
      progress.find.mockResolvedValue([
        { contentItemId: 'a' },
        { contentItemId: 'b' },
        { contentItemId: 'c' },
      ]);

      await service.refreshEnrollment(enrollment, manager);

      expect(enrollmentsService.updateProgressSummary).toHaveBeenCalledWith(
        enrollment.id,
        expect.objectContaining({
          completionPercentage: 100,
          lessonsCompleted: 2,
          status: EnrollmentStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
        manager,
      );
    });

    it('keeps the original completion date on subsequent updates', async () => {
      const completedAt = new Date('2026-01-01');
      progress.find.mockResolvedValue([
        { contentItemId: 'a' },
        { contentItemId: 'b' },
        { contentItemId: 'c' },
      ]);

      await service.refreshEnrollment(
        { ...enrollment, completedAt } as Enrollment,
        manager,
      );

      expect(enrollmentsService.updateProgressSummary).toHaveBeenCalledWith(
        enrollment.id,
        expect.objectContaining({ completedAt }),
        manager,
      );
    });

    it('keeps a course with no completed content as not started', async () => {
      progress.find.mockResolvedValue([]);

      await service.refreshEnrollment(enrollment, manager);

      expect(enrollmentsService.updateProgressSummary).toHaveBeenCalledWith(
        enrollment.id,
        expect.objectContaining({
          completionPercentage: 0,
          status: EnrollmentStatus.NOT_STARTED,
        }),
        manager,
      );
    });
  });
});
