
import { ForbiddenException } from '@nestjs/common';
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
