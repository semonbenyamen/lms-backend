import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { CourseProgressService } from './course-progress.service.js';

describe('CourseProgressService', () => {
  const courseId = 'course-1';
  const studentId = 'student-1';
  const enrollment = {
    id: 'enrollment-1',
    studentId,
    courseId,
    cancelledAt: null,
    completedAt: null,
  };
  const content = (id: string, lessonId: string) => ({
  id,
  lessonId,
  courseId,
  deletedAt: null,
  lesson: { deletedAt: null, section: { deletedAt: null } },
});
  const courses = { findOne: vi.fn() };
  const enrollments = { findOne: vi.fn(), update: vi.fn() };
  const contents = { find: vi.fn() };
  const progress = { find: vi.fn() };
  let service: CourseProgressService;

  beforeEach(() => {
    vi.resetAllMocks();
    courses.findOne.mockResolvedValue({ id: courseId, isPublished: true });
    enrollments.findOne.mockResolvedValue(enrollment);
    contents.find.mockResolvedValue([
      content('a', 'lesson-1'),
      content('b', 'lesson-1'),
      content('c', 'lesson-2'),
    ]);
    progress.find.mockResolvedValue([{ contentItemId: 'a' }, { contentItemId: 'b' }]);
    service = new CourseProgressService(
      courses as unknown as Repository<Course>,
      enrollments as unknown as Repository<Enrollment>,
      contents as unknown as Repository<ContentItem>,
      progress as unknown as Repository<ContentProgress>,
    );
  });

  it('calculates percentage and counts completed lessons', async () => {
    await expect(service.getCourseProgress(studentId, courseId)).resolves.toEqual({
      courseId,
      enrollmentId: enrollment.id,
      totalLessons: 2,
      lessonsCompleted: 1,
      totalContents: 3,
      completedContents: 2,
      completionPercentage: 66.67,
      isCompleted: false,
    });
  });

  it('does not include soft-deleted content or lessons', async () => {
    contents.find.mockResolvedValue([
      content('a', 'lesson-1'),
      { ...content('b', 'lesson-1'), deletedAt: new Date() },
      { ...content('c', 'lesson-2'), lesson: { deletedAt: new Date(), section: { deletedAt: null } } },
    ]);
    progress.find.mockResolvedValue([{ contentItemId: 'a' }]);
    const result = await service.getCourseProgress(studentId, courseId);
    expect(result.totalContents).toBe(1);
    expect(result.lessonsCompleted).toBe(1);
    expect(result.isCompleted).toBe(true);
  });

  it('does not complete an empty course', async () => {
    contents.find.mockResolvedValue([]);
    const result = await service.getCourseProgress(studentId, courseId);
    expect(result.completionPercentage).toBe(0);
    expect(result.isCompleted).toBe(false);
    expect(progress.find).not.toHaveBeenCalled();
  });

  it('rejects a student who is not enrolled', async () => {
    enrollments.findOne.mockResolvedValue(null);
    await expect(service.getCourseProgress(studentId, courseId)).rejects.toThrow(ForbiddenException);
  });

  it('rejects a cancelled enrollment', async () => {
    enrollments.findOne.mockResolvedValue({ ...enrollment, cancelledAt: new Date() });
    await expect(service.getCourseProgress(studentId, courseId)).rejects.toThrow(ForbiddenException);
  });

  it('hides an unpublished course', async () => {
    courses.findOne.mockResolvedValue(null);
    await expect(service.getCourseProgress(studentId, courseId)).rejects.toThrow(NotFoundException);
  });

  it('updates the enrollment with in-progress totals', async () => {
    await service.refreshEnrollment(enrollment.id, courseId);
    expect(enrollments.update).toHaveBeenCalledWith(
      { id: enrollment.id },
      expect.objectContaining({
        completionPercentage: 66.67,
        lessonsCompleted: 1,
        status: EnrollmentStatus.IN_PROGRESS,
        completedAt: null,
      }),
    );
  });

  it('marks a fully completed course as completed', async () => {
    progress.find.mockResolvedValue([
      { contentItemId: 'a' }, { contentItemId: 'b' }, { contentItemId: 'c' },
    ]);
    await service.refreshEnrollment(enrollment.id, courseId);
    expect(enrollments.update).toHaveBeenCalledWith(
      { id: enrollment.id },
      expect.objectContaining({
        completionPercentage: 100,
        lessonsCompleted: 2,
        status: EnrollmentStatus.COMPLETED,
        completedAt: expect.any(Date),
      }),
    );
  });

  it('keeps the original completion date on subsequent updates', async () => {
    const completedAt = new Date('2026-01-01');
    enrollments.findOne.mockResolvedValue({ ...enrollment, completedAt });
    progress.find.mockResolvedValue([
      { contentItemId: 'a' }, { contentItemId: 'b' }, { contentItemId: 'c' },
    ]);
    await service.refreshEnrollment(enrollment.id, courseId);
    expect(enrollments.update).toHaveBeenCalledWith(
      { id: enrollment.id },
      expect.objectContaining({ completedAt }),
    );
  });


it('queries content using the direct courseId relation', async () => {
  await service.getCourseProgress(studentId, courseId);

  expect(contents.find).toHaveBeenCalledWith({
    where: { courseId },
    relations: { lesson: { section: true } },
  });
});

it('excludes content belonging to a soft-deleted section', async () => {
  contents.find.mockResolvedValue([
    content('a', 'lesson-1'),
    {
      ...content('b', 'lesson-2'),
      lesson: {
        deletedAt: null,
        section: { deletedAt: new Date() },
      },
    },
  ]);

  progress.find.mockResolvedValue([{ contentItemId: 'a' }]);

  const result = await service.getCourseProgress(studentId, courseId);

  expect(result.totalContents).toBe(1);
  expect(result.completedContents).toBe(1);
  expect(result.totalLessons).toBe(1);
  expect(result.completionPercentage).toBe(100);
});

it('does not refresh a cancelled enrollment', async () => {
  enrollments.findOne.mockResolvedValue({
    ...enrollment,
    cancelledAt: new Date(),
  });

  await service.refreshEnrollment(enrollment.id, courseId);

  expect(contents.find).not.toHaveBeenCalled();
  expect(enrollments.update).not.toHaveBeenCalled();
});

it('does not refresh an enrollment that does not exist', async () => {
  enrollments.findOne.mockResolvedValue(null);

  await service.refreshEnrollment(enrollment.id, courseId);

  expect(contents.find).not.toHaveBeenCalled();
  expect(enrollments.update).not.toHaveBeenCalled();
});

});
