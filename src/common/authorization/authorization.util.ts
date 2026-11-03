import { ForbiddenException } from '@nestjs/common';
import { JwtPayload } from '../../auth/types/authenticated-request.type.js';
import { Course } from '../../courses/entities/course.entity.js';
import { UserRole } from '../enums/user-role.enum.js';

export function isAdminOrInstructor(role: UserRole): boolean {
  return role === UserRole.ADMIN || role === UserRole.INSTRUCTOR;
}

export function assertAdminOrInstructor(role: UserRole): void {
  if (!isAdminOrInstructor(role)) {
    throw new ForbiddenException(
      'Only admins and instructors can perform this action',
    );
  }
}

// Published courses are open to all users, drafts only to the owner and admins.
export function canReadCourse(
  course: Pick<Course, 'isPublished' | 'instructorId'>,
  user: Pick<JwtPayload, 'sub' | 'role'>,
): boolean {
  return (
    course.isPublished ||
    user.role === UserRole.ADMIN ||
    (user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub)
  );
}

// Reuse ownership checks across courses and content modules.
export function assertOwnershipOrAdmin(
  role: UserRole,
  userId: string,
  ownerId: string,
  action: string,
): void {
  const isAdmin = role === UserRole.ADMIN;
  const isOwner = role === UserRole.INSTRUCTOR && userId === ownerId;

  if (!isAdmin && !isOwner) {
    throw new ForbiddenException(
      `You do not have permission to ${action} this course`,
    );
  }
}
