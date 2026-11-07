import { describe, expect, it } from 'vitest';

import { ContentType } from '../../common/enums/content-type.enum.js';
import { ContentItem } from '../entities/content-item.entity.js';
import { toContentItemResponseDto } from './content-item-response.transformer.js';

describe('toContentItemResponseDto', () => {
  it('should return only the public content item fields', () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const contentItem = {
      id: 'ci-1',
      lessonId: 'l-1',
      title: 'Intro video',
      contentType: ContentType.VIDEO,
      bodyText: 'Transcript',
      videoUrl: 'https://example.com/v.mp4',
      imageUrl: null,
      durationSeconds: 640,
      orderIndex: 1,
      createdAt,
      updatedAt,

      // Internal fields must not be exposed.
      lesson: { id: 'l-1', section: { course: { instructorId: 'i-1' } } },
    } as unknown as ContentItem;

    expect(toContentItemResponseDto(contentItem)).toEqual({
      id: 'ci-1',
      lessonId: 'l-1',
      title: 'Intro video',
      contentType: ContentType.VIDEO,
      bodyText: 'Transcript',
      videoUrl: 'https://example.com/v.mp4',
      imageUrl: null,
      durationSeconds: 640,
      orderIndex: 1,
      createdAt,
      updatedAt,
    });
  });
});
