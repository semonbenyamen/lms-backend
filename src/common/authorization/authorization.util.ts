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