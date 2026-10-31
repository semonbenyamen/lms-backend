import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserRole } from '../../common/enums/user-role.enum.js';
import { CourseOwnershipGuard } from './course-ownership.guard.js';
import { Course } from '../entities/course.entity.js';

describe('CourseOwnershipGuard', () => {
  const mockCoursesRepository = {
    findOne: vi.fn(),
  };

  const guard = new CourseOwnershipGuard(
    mockCoursesRepository as unknown as Repository<Course>,
  );

  const createContext = (
    user: { sub: string; role: UserRole } | undefined,
    id: unknown = 'course-1',
  ) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          params: { id },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow admins to manage any course', async () => {
    const context = createContext({
      sub: 'admin-1',
      role: UserRole.ADMIN,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow instructors to manage their own courses', async () => {
    mockCoursesRepository.findOne.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-1',
    });

    const context = createContext({
      sub: 'instructor-1',
      role: UserRole.INSTRUCTOR,
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should reject instructors who do not own the course', async () => {
    mockCoursesRepository.findOne.mockResolvedValue({
      id: 'course-1',
      instructorId: 'instructor-2',
    });

    const context = createContext({
      sub: 'instructor-1',
      role: UserRole.INSTRUCTOR,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject students', async () => {
    const context = createContext({
      sub: 'student-1',
      role: UserRole.STUDENT,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject unauthenticated users', async () => {
    const context = createContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should reject courses that do not exist', async () => {
    mockCoursesRepository.findOne.mockResolvedValue(null);

    const context = createContext({
      sub: 'instructor-1',
      role: UserRole.INSTRUCTOR,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should reject invalid course IDs', async () => {
    const context = createContext(
      {
        sub: 'instructor-1',
        role: UserRole.INSTRUCTOR,
      },
      ['course-1', 'course-2'],
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });
});
