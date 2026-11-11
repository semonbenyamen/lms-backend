import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { EnrollmentStatus } from '../common/enums/enrollment-status.enum.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Enrollment } from './entities/enrollment.entity.js';
import { EnrollmentsService } from './enrollments.service.js';

describe('EnrollmentsService', () => {
  let service: EnrollmentsService;

  const studentId = 'student-123';
  const courseId = 'course-123';

  const existingEnrollment = {
    id: 'enrollment-123',
    studentId,
    courseId,
    status: EnrollmentStatus.NOT_STARTED,
    completionPercentage: 0,
    lessonsCompleted: 0,
  } as Enrollment;

  const enrollmentsRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    count: vi.fn(),
    exists: vi.fn(),
    createQueryBuilder: vi.fn(),
  };

  // Reaches the course of a content through its lesson and section.
  const contentQueryBuilder = {
    innerJoin: vi.fn(),
    where: vi.fn(),
    andWhere: vi.fn(),
    getOne: vi.fn(),
  };

  const manager = {
    getRepository: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();

    service = new EnrollmentsService(
      enrollmentsRepository as unknown as Repository<Enrollment>,
    );

    manager.getRepository.mockReturnValue(enrollmentsRepository);
    enrollmentsRepository.createQueryBuilder.mockReturnValue(
      contentQueryBuilder,
    );
    contentQueryBuilder.innerJoin.mockReturnThis();
    contentQueryBuilder.where.mockReturnThis();
    contentQueryBuilder.andWhere.mockReturnThis();
  });

  it('should lock the enrollment inside the given transaction', async () => {
    const manager = { findOne: vi.fn() };

    await service.lockEnrollment(
      'enrollment-1',
      manager as unknown as EntityManager,
    );

    expect(manager.findOne).toHaveBeenCalledWith(Enrollment, {
      where: { id: 'enrollment-1' },
      lock: { mode: 'pessimistic_write' },
    });
  });

  it('should check an active enrollment in a course', async () => {
    enrollmentsRepository.exists.mockResolvedValue(true);

    await expect(
      service.hasActiveEnrollment(studentId, courseId),
    ).resolves.toBe(true);
    expect(enrollmentsRepository.exists).toHaveBeenCalledWith({
      where: { studentId, courseId, cancelledAt: IsNull() },
    });
  });

  it('should find the active enrollment in the course that owns a content', async () => {
    contentQueryBuilder.getOne.mockResolvedValue(existingEnrollment);

    await expect(
      service.findActiveEnrollmentByContent(studentId, 'content-1'),
    ).resolves.toBe(existingEnrollment);

    expect(contentQueryBuilder.innerJoin).toHaveBeenCalledWith(
      ContentItem,
      'content',
      'content.courseId = enrollment.courseId',
    );
    expect(contentQueryBuilder.andWhere).toHaveBeenCalledWith(
      'content.id = :contentId',
      { contentId: 'content-1' },
    );
    expect(contentQueryBuilder.andWhere).toHaveBeenCalledWith(
      'enrollment.cancelledAt IS NULL',
    );
  });

  it('should create a new enrollment', async () => {
    enrollmentsRepository.findOne.mockResolvedValue(null);
    enrollmentsRepository.create.mockReturnValue(existingEnrollment);
    enrollmentsRepository.save.mockResolvedValue(existingEnrollment);

    const result = await service.createOrFindEnrollment(
      studentId,
      courseId,
      manager as unknown as EntityManager,
    );

    expect(result).toEqual({
      enrollment: existingEnrollment,
      created: true,
    });

    expect(enrollmentsRepository.create).toHaveBeenCalledWith({
      studentId,
      courseId,
      status: EnrollmentStatus.NOT_STARTED,
      completionPercentage: 0,
      lessonsCompleted: 0,
    });

    expect(enrollmentsRepository.save).toHaveBeenCalledOnce();
  });

  it('should return an existing enrollment', async () => {
    enrollmentsRepository.findOne.mockResolvedValue(existingEnrollment);

    const result = await service.createOrFindEnrollment(
      studentId,
      courseId,
      manager as unknown as EntityManager,
    );

    expect(result).toEqual({
      enrollment: existingEnrollment,
      created: false,
    });

    expect(enrollmentsRepository.create).not.toHaveBeenCalled();
    expect(enrollmentsRepository.save).not.toHaveBeenCalled();
  });

  it('should detect active enrollments', async () => {
    enrollmentsRepository.count.mockResolvedValue(1);

    const result = await service.hasActiveEnrollments(
      courseId,
      manager as unknown as EntityManager,
    );

    expect(result).toBe(true);

    expect(enrollmentsRepository.count).toHaveBeenCalledWith({
      where: {
        courseId,
        cancelledAt: IsNull(),
      },
    });
  });

  it('should allow deletion when no active enrollments exist', async () => {
    enrollmentsRepository.count.mockResolvedValue(0);

    const result = await service.hasActiveEnrollments(
      courseId,
      manager as unknown as EntityManager,
    );

    expect(result).toBe(false);
  });

  it('should find an existing enrollment', async () => {
    enrollmentsRepository.findOne.mockResolvedValue(existingEnrollment);

    const result = await service.findExistingEnrollment(studentId, courseId);

    expect(result).toEqual(existingEnrollment);
    expect(enrollmentsRepository.findOne).toHaveBeenCalledWith({
      where: { studentId, courseId },
    });
  });

  it('should return null when enrollment does not exist', async () => {
    enrollmentsRepository.findOne.mockResolvedValue(null);

    const result = await service.findExistingEnrollment(studentId, courseId);

    expect(result).toBeNull();
  });
});
