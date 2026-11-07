import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';
import { SectionLessonsController } from './section-lessons.controller.js';

describe('LessonsController', () => {
  let controller: LessonsController;
  let sectionLessonsController: SectionLessonsController;

  const mockLessonsService = {
    create: vi.fn(),
    findById: vi.fn(),
    findBySection: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };

  const mockReq: AuthenticatedRequest = {
    user: {
      sub: 'instructor-1',
      email: 'instructor@example.com',
      role: UserRole.INSTRUCTOR,
    },
  } as unknown as AuthenticatedRequest;

  const expectedUser = {
    sub: mockReq.user.sub,
    role: mockReq.user.role,
  };

  const lesson = {
    id: 'l-1',
    sectionId: 'section-1',
    title: 'Lesson 1',
    orderIndex: 1,
    topic: null,
    difficulty: null,
    prerequisites: null,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-02T10:00:00.000Z'),
    deletedAt: null,
    section: { id: 'section-1' },
  };

  const expectedLesson = {
    id: lesson.id,
    sectionId: lesson.sectionId,
    title: lesson.title,
    orderIndex: lesson.orderIndex,
    topic: lesson.topic,
    difficulty: lesson.difficulty,
    prerequisites: lesson.prerequisites,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectionLessonsController, LessonsController],
      providers: [
        {
          provide: LessonsService,
          useValue: mockLessonsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LessonOwnershipGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<LessonsController>(LessonsController);
    sectionLessonsController = module.get<SectionLessonsController>(
      SectionLessonsController,
    );
  });

  it('should create a lesson and return transformed data', async () => {
    const dto = { title: 'Lesson 1', orderIndex: 1 };
    mockLessonsService.create.mockResolvedValue(lesson);

    const result = await sectionLessonsController.create('section-1', dto);

    expect(mockLessonsService.create).toHaveBeenCalledWith('section-1', dto);

    expect(result).toEqual(expectedLesson);
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('section');
  });

  it('should find lesson by ID and return transformed data', async () => {
    mockLessonsService.findById.mockResolvedValue(lesson);

    const result = await controller.findOne('l-1', mockReq);

    expect(mockLessonsService.findById).toHaveBeenCalledWith(
      'l-1',
      expectedUser,
    );

    expect(result).toEqual(expectedLesson);
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('section');
  });

  it('should return all lessons without pagination and transform them', async () => {
    mockLessonsService.findBySection.mockResolvedValue([lesson]);

    const result = await sectionLessonsController.findBySection(
      'section-1',
      mockReq,
    );

    expect(mockLessonsService.findBySection).toHaveBeenCalledWith(
      'section-1',
      expectedUser,
    );

    expect(result).toEqual([expectedLesson]);
    expect(result[0]).not.toHaveProperty('deletedAt');
    expect(result[0]).not.toHaveProperty('section');
  });

  it('should update a lesson and return transformed data', async () => {
    const updatedLesson = { ...lesson, title: 'Updated' };
    mockLessonsService.update.mockResolvedValue(updatedLesson);

    const result = await controller.update('l-1', { title: 'Updated' });

    expect(mockLessonsService.update).toHaveBeenCalledWith('l-1', {
      title: 'Updated',
    });

    expect(result).toEqual({
      ...expectedLesson,
      title: 'Updated',
    });

    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('section');
  });

  it('should delete a lesson', async () => {
    mockLessonsService.remove.mockResolvedValue(undefined);

    await controller.remove('l-1');

    expect(mockLessonsService.remove).toHaveBeenCalledWith('l-1');
  });
});
