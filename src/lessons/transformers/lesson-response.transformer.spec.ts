import { describe, expect, it } from 'vitest';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
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
      topic: 'TypeScript',
      difficulty: CourseDifficulty.BEGINNER,
      prerequisites: ['JavaScript'],
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
      topic: 'TypeScript',
      difficulty: CourseDifficulty.BEGINNER,
      prerequisites: ['JavaScript'],
      createdAt,
      updatedAt,
    });

    expect(result).not.toHaveProperty('section');
    expect(result).not.toHaveProperty('deletedAt');
  });
});
