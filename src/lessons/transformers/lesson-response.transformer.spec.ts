import { describe, expect, it } from 'vitest';

import { Lesson } from '../entities/lesson.entity.js';
import { toLessonResponseDto } from './lesson-response.transformer.js';

describe('toLessonResponseDto', () => {
  it('should return only the public lesson fields', () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const lesson = {
      id: 'lesson-1',
      sectionId: 'section-1',
      title: 'Introduction',
      orderIndex: 1,
      createdAt,
      updatedAt,
      deletedAt: null,
      section: { id: 'section-1' },
    } as Lesson;

    const result = toLessonResponseDto(lesson);

    expect(result).toEqual({
      id: 'lesson-1',
      sectionId: 'section-1',
      title: 'Introduction',
      orderIndex: 1,
      createdAt,
      updatedAt,
    });

    expect(result).not.toHaveProperty('section');
    expect(result).not.toHaveProperty('deletedAt');
    expect(result).not.toHaveProperty('contentItems');
  });

  it('should return the loaded content items without their relations', () => {
    const lesson = {
      id: 'lesson-1',
      contentItems: [
        { id: 'ci-1', lessonId: 'lesson-1', lesson: { id: 'lesson-1' } },
      ],
    } as unknown as Lesson;

    const { contentItems } = toLessonResponseDto(lesson);

    expect(contentItems).toHaveLength(1);
    expect(contentItems?.[0]).toMatchObject({
      id: 'ci-1',
      lessonId: 'lesson-1',
    });
    expect(contentItems?.[0]).not.toHaveProperty('lesson');
  });
});
