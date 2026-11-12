import type { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { MyEnrollmentResponseDto } from '../dto/my-enrollment-response.dto.js';

// Return only the fields defined in the public response DTO, with the
// progress calculated from the live content.
export function toMyEnrollmentResponseDto(
  enrollment: Enrollment,
  progress: Pick<MyEnrollmentResponseDto, 'status' | 'completionPercentage'>,
): MyEnrollmentResponseDto {
  return {
    id: enrollment.id,
    status: progress.status,
    completionPercentage: progress.completionPercentage,
    lastActivityAt: enrollment.lastActivityAt,
    enrolledAt: enrollment.enrolledAt,
    course: {
      id: enrollment.course.id,
      title: enrollment.course.title,
      thumbnailUrl: enrollment.course.thumbnailUrl,
      isPublished: enrollment.course.isPublished,
    },
  };
}
