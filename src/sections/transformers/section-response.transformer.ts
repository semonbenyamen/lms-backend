import { toLessonResponseDto } from '../../lessons/transformers/lesson-response.transformer.js';
import { SectionResponseDto } from '../dto/section-response.dto.js';
import { Section } from '../entities/section.entity.js';

export function toSectionResponseDto(section: Section): SectionResponseDto {
  // Return only the fields defined in the public response DTO.
  return {
    id: section.id,
    courseId: section.courseId,
    title: section.title,
    orderIndex: section.orderIndex,
    // Only the published course details load the lessons.
    ...(section.lessons && {
      lessons: section.lessons.map(toLessonResponseDto),
    }),
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}
