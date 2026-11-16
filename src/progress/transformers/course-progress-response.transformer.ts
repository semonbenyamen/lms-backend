import type { CourseProgressSummary } from '../course-progress.service.js';
import { CourseProgressResponseDto } from '../dto/course-progress-response.dto.js';

// Return only the fields defined in the public response DTO.
export function toCourseProgressResponseDto(
  summary: CourseProgressSummary,
): CourseProgressResponseDto {
  return {
    courseId: summary.courseId,
    totalLessons: summary.totalLessons,
    lessonsCompleted: summary.lessonsCompleted,
    totalContents: summary.totalContents,
    completedContents: summary.completedContents,
    completedContentIds: summary.completedContentIds,
    completionPercentage: summary.completionPercentage,
    isCompleted: summary.isCompleted,
  };
}
