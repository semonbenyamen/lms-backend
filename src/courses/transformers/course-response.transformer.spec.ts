import { describe, expect, it } from 'vitest';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../../common/enums/course-language.enum.js';
import { Course } from '../entities/course.entity.js';
import { toCourseResponseDto } from './course-response.transformer.js';

describe('toCourseResponseDto', () => {
  it('should return only the public course fields', () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const course = {
      id: 'course-1',
      title: 'NestJS',
      description: 'Backend course',
      categoryId: 'category-1',
      category: {
        id: 'category-1',
        name: 'Backend',
        createdAt,
        updatedAt,
      },
      topics: ['NestJS'],
      difficulty: CourseDifficulty.BEGINNER,
      language: CourseLanguage.ENGLISH,
      prerequisites: null,
      estimatedDuration: 120,
      isPublished: false,
      instructorId: 'instructor-1',
      createdAt,
      updatedAt,

      // Internal fields must not be exposed.
      deletedAt: null,
      instructor: { id: 'instructor-1', password: 'hash' },
    } as unknown as Course;

    expect(toCourseResponseDto(course)).toEqual({
      id: 'course-1',
      title: 'NestJS',
      description: 'Backend course',
      categoryId: 'category-1',
      category: { id: 'category-1', name: 'Backend' },
      topics: ['NestJS'],
      difficulty: CourseDifficulty.BEGINNER,
      language: CourseLanguage.ENGLISH,
      prerequisites: null,
      estimatedDuration: 120,
      isPublished: false,
      instructorId: 'instructor-1',
      createdAt,
      updatedAt,
    });
  });
});
