import { describe, expect, it } from 'vitest';

import { toCourseProgressResponseDto } from './course-progress-response.transformer.js';

describe('toCourseProgressResponseDto', () => {
  it('should return only the public progress fields', () => {
    const summary = {
      courseId: 'course-1',
      totalLessons: 2,
      lessonsCompleted: 1,
      totalContents: 3,
      completedContents: 2,
      completionPercentage: 66.67,
      isCompleted: false,
      enrollmentId: 'enrollment-1',
    };

    expect(toCourseProgressResponseDto(summary)).toEqual({
      courseId: 'course-1',
      totalLessons: 2,
      lessonsCompleted: 1,
      totalContents: 3,
      completedContents: 2,
      completionPercentage: 66.67,
      isCompleted: false,
    });
  });
});
