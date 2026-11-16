import { EnrollmentResponseDto } from '../dto/enrollment-response.dto.js';
import { Enrollment } from '../entities/enrollment.entity.js';

// Return only the fields defined in the public response DTO.
export function toEnrollmentResponseDto(
  enrollment: Enrollment,
): EnrollmentResponseDto {
  return {
    id: enrollment.id,
    courseId: enrollment.courseId,
    status: enrollment.status,
    completionPercentage: enrollment.completionPercentage,
    lessonsCompleted: enrollment.lessonsCompleted,
    lastActivityAt: enrollment.lastActivityAt,
    completedAt: enrollment.completedAt,
    enrolledAt: enrollment.enrolledAt,
  };
}
