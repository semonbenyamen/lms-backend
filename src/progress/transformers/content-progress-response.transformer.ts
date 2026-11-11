import { ContentProgressResponseDto } from '../dto/content-progress-response.dto.js';
import { ContentProgress } from '../entities/content-progress.entity.js';

// Return only the fields defined in the public response DTO. Content the
// student has not started yet has no record, so it gets the starting values.
export function toContentProgressResponseDto(
  contentItemId: string,
  progress: ContentProgress | null,
): ContentProgressResponseDto {
  return {
    contentItemId,
    isCompleted: progress?.isCompleted ?? false,
    lastPositionSeconds: progress?.lastPositionSeconds ?? 0,
    completedAt: progress?.completedAt ?? null,
  };
}
