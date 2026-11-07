import { ContentType } from '../common/enums/content-type.enum.js';

export interface TypeFieldValues {
  bodyText?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  durationSeconds?: number | null;
}

// The field each content type requires.
const TYPE_FIELD: Record<ContentType, keyof TypeFieldValues> = {
  [ContentType.TEXT]: 'bodyText',
  [ContentType.VIDEO]: 'videoUrl',
  [ContentType.IMAGE]: 'imageUrl',
};

const filled = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const trimmedOrNull = (value: unknown): string | null =>
  filled(value) ? value.trim() : null;

// Why the type's field is missing; null means it's there.
export function getTypeFieldError(
  contentType: ContentType,
  values: TypeFieldValues,
): string | null {
  const field = TYPE_FIELD[contentType];

  return filled(values[field])
    ? null
    : `${field} is required for ${contentType} content`;
}

// Keeps the type's own field and clears the others. A video may keep its
// transcript in bodyText, and only a video has a duration.
export function pickTypeFields(
  contentType: ContentType,
  values: TypeFieldValues,
): Required<TypeFieldValues> {
  const field = TYPE_FIELD[contentType];
  const isVideo = contentType === ContentType.VIDEO;

  return {
    bodyText:
      field === 'bodyText' || isVideo ? trimmedOrNull(values.bodyText) : null,
    videoUrl: field === 'videoUrl' ? trimmedOrNull(values.videoUrl) : null,
    imageUrl: field === 'imageUrl' ? trimmedOrNull(values.imageUrl) : null,
    durationSeconds: isVideo ? (values.durationSeconds ?? null) : null,
  };
}
