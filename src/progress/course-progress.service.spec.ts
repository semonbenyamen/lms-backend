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

  const progress = { find: vi.fn() };
  const contentsService = { findCourseContentLessons: vi.fn() };
  const coursesService = { findById: vi.fn() };
  const enrollmentsService = {
    findActiveEnrollment: vi.fn(),
    updateProgressSummary: vi.fn(),
  };
  const manager = {
    getRepository: vi.fn(() => progress),
  } as unknown as EntityManager;
  let service: CourseProgressService;

  beforeEach(() => {
    vi.clearAllMocks();
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
