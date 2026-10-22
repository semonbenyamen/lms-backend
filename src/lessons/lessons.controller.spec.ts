import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
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
      .compile();

    controller = module.get<LessonsController>(LessonsController);
    sectionLessonsController = module.get<SectionLessonsController>(
      SectionLessonsController,
    );
  });

  it('should create a lesson in a section', async () => {
    const dto = { title: 'Lesson 1', orderIndex: 1 };
    mockLessonsService.create.mockResolvedValue({ id: 'l-1', ...dto });

    const result = await sectionLessonsController.create(
      'section-1',
      dto,
      mockReq,
    );

    expect(mockLessonsService.create).toHaveBeenCalledWith(
      'section-1',
      dto,
      mockReq.user,
    );
    expect(result).toHaveProperty('id', 'l-1');
  });

  it('should find lesson by ID', async () => {
    const lesson = { id: 'l-1', title: 'Lesson 1' };
    mockLessonsService.findById.mockResolvedValue(lesson);

    const result = await controller.findOne('l-1', mockReq);

    expect(mockLessonsService.findById).toHaveBeenCalledWith('l-1', mockReq.user);
    expect(result).toEqual(lesson);
  });

  it('should find lessons by section ID', async () => {
    mockLessonsService.findBySection.mockResolvedValue([]);

    const result = await sectionLessonsController.findBySection(
      'section-1',
      mockReq,
    );

    expect(mockLessonsService.findBySection).toHaveBeenCalledWith(
      'section-1',
      mockReq.user,
      undefined,
    );
    expect(result).toEqual([]);
  });

  it('should update a lesson', async () => {
    mockLessonsService.update.mockResolvedValue({ id: 'l-1', title: 'Updated' });

    const result = await controller.update('l-1', { title: 'Updated' }, mockReq);

    expect(mockLessonsService.update).toHaveBeenCalledWith(
      'l-1',
      { title: 'Updated' },
      mockReq.user,
    );
    expect(result).toHaveProperty('title', 'Updated');
  });

  it('should delete a lesson', async () => {
    mockLessonsService.remove.mockResolvedValue(undefined);

    await controller.remove('l-1', mockReq);

    expect(mockLessonsService.remove).toHaveBeenCalledWith('l-1', mockReq.user);
  });
});
