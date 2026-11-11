import { CourseResponseDto } from '../dto/course-response.dto.js';
import { Course } from '../entities/course.entity.js';

// Return only the fields defined in the public response DTO.
export function toCourseResponseDto(course: Course): CourseResponseDto {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    categoryId: course.categoryId,
    category: {
      id: course.category.id,
      name: course.category.name,
    },
    topics: course.topics,
    difficulty: course.difficulty,
    language: course.language,
    prerequisites: course.prerequisites,
    estimatedDuration: course.estimatedDuration,
    isPublished: course.isPublished,
    thumbnailUrl: course.thumbnailUrl,
    instructorId: course.instructorId,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}
