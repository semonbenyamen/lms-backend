import { LessonResponseDto } from '../dto/lesson-response.dto.js';
import { Lesson } from '../entities/lesson.entity.js';

// Return only the fields defined in the public response DTO.
export function toLessonResponseDto(lesson: Lesson): LessonResponseDto {
  return {
    id: lesson.id,
    sectionId: lesson.sectionId,
    title: lesson.title,
    orderIndex: lesson.orderIndex,
    topic: lesson.topic,
    difficulty: lesson.difficulty,
    prerequisites: lesson.prerequisites,
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}
