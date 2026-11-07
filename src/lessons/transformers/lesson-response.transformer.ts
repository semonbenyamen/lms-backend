import { toContentItemResponseDto } from '../../contents/transformers/content-item-response.transformer.js';
import { LessonResponseDto } from '../dto/lesson-response.dto.js';
import { Lesson } from '../entities/lesson.entity.js';

// Return only the fields defined in the public response DTO.
export function toLessonResponseDto(lesson: Lesson): LessonResponseDto {
  return {
    id: lesson.id,
    sectionId: lesson.sectionId,
    title: lesson.title,
    orderIndex: lesson.orderIndex,
    // Only the lesson details load its content items.
    ...(lesson.contentItems && {
      contentItems: lesson.contentItems.map(toContentItemResponseDto),
    }),
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}
