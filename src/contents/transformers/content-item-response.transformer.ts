import { ContentItemResponseDto } from '../dto/content-item-response.dto.js';
import { ContentItem } from '../entities/content-item.entity.js';

// Return only the fields defined in the public response DTO.
export function toContentItemResponseDto(
  contentItem: ContentItem,
): ContentItemResponseDto {
  return {
    id: contentItem.id,
    lessonId: contentItem.lessonId,
    title: contentItem.title,
    contentType: contentItem.contentType,
    bodyText: contentItem.bodyText,
    videoUrl: contentItem.videoUrl,
    imageUrl: contentItem.imageUrl,
    durationSeconds: contentItem.durationSeconds,
    language: contentItem.language,
    orderIndex: contentItem.orderIndex,
    tags: contentItem.tags,
    createdAt: contentItem.createdAt,
    updatedAt: contentItem.updatedAt,
  };
}
