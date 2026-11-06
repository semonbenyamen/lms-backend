import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../enums/user-role.enum.js';
import type { JwtPayload } from '../../auth/types/authenticated-request.type.js';
import type { Course } from '../../courses/entities/course.entity.js';


// Published courses are visible to everyone.
// Draft courses are visible only to their owner and admins.
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
