import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource, Repository } from 'typeorm';

import { ContentType } from '../common/enums/content-type.enum.js';
import { ContentsService } from '../contents/contents.service.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { ContentProgressHistory } from './entities/content-progress-history.entity.js';
import { ProgressService } from './progress.service.js';
import { CourseProgressService } from './course-progress.service.js';

describe('ProgressService', () => {
  const studentId = 'student-id';
  const contentId = 'content-id';
  const courseId = 'course-id';

  const content = {
    id: contentId,
    lessonId: 'lesson-id',
    courseId,
    contentType: ContentType.VIDEO,
    durationSeconds: 100,
  };

  const enrollment = {
    id: 'enrollment-id',
    courseId,
    cancelledAt: null,
    course: { id: courseId, isPublished: true },
  };

  const draftEnrollment = {
    ...enrollment,
    course: { id: courseId, isPublished: false },
  };

  const contentsService = {
    findProgressContentReference: vi.fn(),
    contentExists: vi.fn(),
  };

  const enrollmentsService = {
    findActiveEnrollmentByContent: vi.fn(),
    lockEnrollment: vi.fn(),
  };

  const progress = {
    findOne: vi.fn(),
    findOneOrFail: vi.fn(),
    upsert: vi.fn(),
  };

  const history = {
    insert: vi.fn(),
  };

  const manager = {
    getRepository: vi.fn(),
  };

  const dataSource = {
    transaction: vi.fn(),
  };

  const courseProgress = {
    refreshEnrollment: vi.fn(),
  };

  let service: ProgressService;

  beforeEach(() => {
    vi.resetAllMocks();

    contentsService.findProgressContentReference.mockResolvedValue(content);
    contentsService.contentExists.mockResolvedValue(true);

    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(
      enrollment,
    );

    progress.findOne.mockResolvedValue(null);
    progress.findOneOrFail.mockResolvedValue({
      enrollmentId: enrollment.id,
      contentItemId: contentId,
      isCompleted: true,
    });
    progress.upsert.mockResolvedValue(undefined);
    history.insert.mockResolvedValue(undefined);
    courseProgress.refreshEnrollment.mockResolvedValue(undefined);

    manager.getRepository.mockImplementation((entity) => {
      if (entity === ContentProgress) return progress;
      if (entity === ContentProgressHistory) return history;
      throw new Error('Unexpected repository');
    });

    dataSource.transaction.mockImplementation(async (callback) =>
      callback(manager),
    );

    service = new ProgressService(
      progress as unknown as Repository<ContentProgress>,
      contentsService as unknown as ContentsService,
      enrollmentsService as unknown as EnrollmentsService,
      dataSource as unknown as DataSource,
      courseProgress as unknown as CourseProgressService,
    );
  });

  it('blocks students who are not enrolled', async () => {
    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(null);

    await expect(service.getProgress(studentId, contentId)).rejects.toThrow(
      ForbiddenException,
    );

    expect(progress.findOne).not.toHaveBeenCalled();
  });

  it('hides unpublished content', async () => {
    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(
      draftEnrollment,
    );

    await expect(service.getProgress(studentId, contentId)).rejects.toThrow(
      NotFoundException,
    );

    expect(
      enrollmentsService.findActiveEnrollmentByContent,
    ).toHaveBeenCalledWith(studentId, contentId);
  });

  it('returns the starting values for content not started yet', async () => {
    await expect(service.getProgress(studentId, contentId)).resolves.toEqual({
      contentItemId: contentId,
      isCompleted: false,
      lastPositionSeconds: 0,
      completedAt: null,
    });
  });

  it('reads the progress for the current enrollment', async () => {
    await service.getProgress(studentId, contentId);

    expect(contentsService.findProgressContentReference).not.toHaveBeenCalled();

    expect(progress.findOne).toHaveBeenCalledWith({
      where: {
        enrollmentId: enrollment.id,
        contentItemId: contentId,
      },
    });
  });

  it('saves video playback position and history', async () => {
    await service.updateStudentContentProgress(studentId, contentId, {
      lastPositionSeconds: 45,
    });

    expect(dataSource.transaction).toHaveBeenCalledOnce();

    expect(progress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: enrollment.id,
        contentItemId: contentId,
        lastPositionSeconds: 45,
        isCompleted: false,
      }),
      ['enrollmentId', 'contentItemId'],
    );

    expect(history.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        enrollmentId: enrollment.id,
        contentItemId: contentId,
        lastPositionSeconds: 45,
        isCompleted: false,
      }),
    );

    expect(courseProgress.refreshEnrollment).toHaveBeenCalledWith(
      enrollment.id,
      courseId,
      manager,
    );
  });

  it('appends a history record for every progress update', async () => {
    await service.updateStudentContentProgress(studentId, contentId, {
      lastPositionSeconds: 20,
    });

    await service.updateStudentContentProgress(studentId, contentId, {
      lastPositionSeconds: 40,
    });

    expect(history.insert).toHaveBeenCalledTimes(2);

    expect(history.insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ lastPositionSeconds: 20 }),
    );

    expect(history.insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ lastPositionSeconds: 40 }),
    );
    expect(courseProgress.refreshEnrollment).toHaveBeenCalledTimes(2);
  });

  it('rejects video position beyond duration', async () => {
    await expect(
      service.updateStudentContentProgress(studentId, contentId, {
        lastPositionSeconds: 101,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not allow video position on text content', async () => {
    contentsService.findProgressContentReference.mockResolvedValue({
      ...content,
      contentType: ContentType.TEXT,
    });

    await expect(
      service.updateStudentContentProgress(studentId, contentId, {
        lastPositionSeconds: 10,
      }),
    ).rejects.toThrow(BadRequestException);

    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('does not reset completed content', async () => {
    progress.findOne.mockResolvedValue({
      isCompleted: true,
      lastPositionSeconds: 70,
      completedAt: new Date('2026-01-01'),
    });

    await service.updateStudentContentProgress(studentId, contentId, {
      isCompleted: false,
      lastPositionSeconds: 20,
    });

    expect(progress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: true,
        lastPositionSeconds: 70,
      }),
      ['enrollmentId', 'contentItemId'],
    );

    // History preserves the position submitted in this update.
    expect(history.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        isCompleted: true,
        lastPositionSeconds: 20,
      }),
    );
  });

  it('propagates history write failures from the transaction', async () => {
    history.insert.mockRejectedValue(new Error('History insert failed'));

    await expect(
      service.updateStudentContentProgress(studentId, contentId, {
        lastPositionSeconds: 30,
      }),
    ).rejects.toThrow('History insert failed');

    expect(progress.upsert).toHaveBeenCalledOnce();
    expect(history.insert).toHaveBeenCalledOnce();
    expect(courseProgress.refreshEnrollment).not.toHaveBeenCalled();
  });

  it('returns 404 for missing or deleted content', async () => {
    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(null);
    contentsService.contentExists.mockResolvedValue(false);

    await expect(service.getProgress(studentId, contentId)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.updateStudentContentProgress(studentId, contentId, {
        isCompleted: true,
      }),
    ).rejects.toThrow(NotFoundException);

    expect(contentsService.contentExists).toHaveBeenCalledWith(contentId);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('locks the enrollment before reading the current progress', async () => {
    await service.updateStudentContentProgress(studentId, contentId, {
      lastPositionSeconds: 10,
    });

    expect(enrollmentsService.lockEnrollment).toHaveBeenCalledWith(
      enrollment.id,
      manager,
    );
    expect(
      enrollmentsService.lockEnrollment.mock.invocationCallOrder[0],
    ).toBeLessThan(progress.findOne.mock.invocationCallOrder[0]);
  });

  it('does not read progress when enrollment is missing', async () => {
    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(null);

    await expect(service.getProgress(studentId, contentId)).rejects.toThrow(
      ForbiddenException,
    );

    expect(contentsService.findProgressContentReference).not.toHaveBeenCalled();
    expect(progress.findOne).not.toHaveBeenCalled();
  });

  it('checks enrollment before rejecting unpublished content', async () => {
    enrollmentsService.findActiveEnrollmentByContent.mockResolvedValue(
      draftEnrollment,
    );

    await expect(service.getProgress(studentId, contentId)).rejects.toThrow(
      NotFoundException,
    );

    expect(
      enrollmentsService.findActiveEnrollmentByContent,
    ).toHaveBeenCalledWith(studentId, contentId);

    expect(progress.findOne).not.toHaveBeenCalled();
  });
});
