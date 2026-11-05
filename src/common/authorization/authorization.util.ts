
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum.js';

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
