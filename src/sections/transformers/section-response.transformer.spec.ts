import { describe, expect, it } from 'vitest';

import { Section } from '../entities/section.entity.js';
import { toSectionResponseDto } from './section-response.transformer.js';

describe('toSectionResponseDto', () => {
  it('should return only the public section fields', () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const section = {
      id: 'section-1',
      courseId: 'course-1',
      title: 'Chapter 1',
      orderIndex: 1,
      createdAt,
      updatedAt,

      // Internal fields must not be exposed.
      deletedAt: null,
      course: {
        id: 'course-1',
        instructorId: 'instructor-1',
      },
    } as unknown as Section;

    const result = toSectionResponseDto(section);

    // Verify the exact response structure.
    expect(result).toEqual({
      id: 'section-1',
      courseId: 'course-1',
      title: 'Chapter 1',
      orderIndex: 1,
      createdAt,
      updatedAt,
    });

    // Internal entity relations must not be returned.
    expect(result).not.toHaveProperty('course');
    expect(result).not.toHaveProperty('lessons');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('should include the lessons when they are loaded', () => {
    const section = {
      id: 'section-1',
      courseId: 'course-1',
      title: 'Chapter 1',
      orderIndex: 1,
      lessons: [
        {
          id: 'lesson-1',
          sectionId: 'section-1',
          title: 'Lesson 1',
          orderIndex: 1,
          section: { id: 'section-1' },
        },
      ],
    } as unknown as Section;

    const { lessons } = toSectionResponseDto(section);

    expect(lessons).toHaveLength(1);
    expect(lessons?.[0]).toMatchObject({ id: 'lesson-1', title: 'Lesson 1' });
    expect(lessons?.[0]).not.toHaveProperty('section');
  });
});
