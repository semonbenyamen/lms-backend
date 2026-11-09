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
    getLesson: vi.fn(),
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

  // The service returns a public DTO, not a database entity.
  const lessonDto = {
    id: 'l-1',
    sectionId: 'section-1',
    title: 'Lesson 1',
    orderIndex: 1,
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    updatedAt: new Date('2026-11-02T10:00:00.000Z'),
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
      // Mock guards to isolate controller behavior.
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

  it('should create a lesson without returning its data', async () => {
    const dto = {
      title: 'Lesson 1',
      orderIndex: 1,
    };

    mockLessonsService.create.mockResolvedValue(undefined);

    const result = await sectionLessonsController.create('section-1', dto);

    expect(mockLessonsService.create).toHaveBeenCalledWith('section-1', dto);

    // POST should not expose the created lesson.
    expect(result).toBeUndefined();
  });

  it('should return the lesson DTO provided by the service', async () => {
    mockLessonsService.getLesson.mockResolvedValue(lessonDto);

    const result = await controller.findOne('l-1', mockReq);

    expect(mockLessonsService.getLesson).toHaveBeenCalledWith(
      'l-1',
      expectedUser,
    );

    // The controller should return the DTO unchanged.
    expect(result).toEqual(lessonDto);

    // Database-only fields should not be exposed.
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('section');
  });

  it('should return all lesson DTOs without pagination', async () => {
    const secondLessonDto = {
      id: 'l-2',
      sectionId: 'section-1',
      title: 'Lesson 2',
      orderIndex: 2,
      createdAt: new Date('2026-11-01T10:00:00.000Z'),
      updatedAt: new Date('2026-11-02T10:00:00.000Z'),
    };

    const lessonDtos = [lessonDto, secondLessonDto];

    mockLessonsService.findBySection.mockResolvedValue(lessonDtos);

    const result = await sectionLessonsController.findBySection(
      'section-1',
      mockReq,
    );

    expect(mockLessonsService.findBySection).toHaveBeenCalledWith(
      'section-1',
      expectedUser,
    );

    // The controller should return the complete DTO list unchanged.
    expect(result).toEqual(lessonDtos);
    expect(result).toHaveLength(2);

    expect(result[0]).not.toHaveProperty('deletedAt');
    expect(result[0]).not.toHaveProperty('section');
    expect(result[1]).not.toHaveProperty('deletedAt');
    expect(result[1]).not.toHaveProperty('section');
  });

  it('should update a lesson without returning its data', async () => {
    const dto = {
      title: 'Updated',
    };

    mockLessonsService.update.mockResolvedValue(undefined);

    const result = await controller.update('l-1', dto);

    expect(mockLessonsService.update).toHaveBeenCalledWith('l-1', dto);

    // PATCH should not expose the updated lesson.
    expect(result).toBeUndefined();
  });

  it('should delete a lesson', async () => {
    mockLessonsService.remove.mockResolvedValue(undefined);

    await controller.remove('l-1');

    expect(mockLessonsService.remove).toHaveBeenCalledWith('l-1');
  });
});
