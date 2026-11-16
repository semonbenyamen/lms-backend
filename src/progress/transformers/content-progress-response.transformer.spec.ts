import { describe, expect, it } from 'vitest';

import { ContentProgress } from '../entities/content-progress.entity.js';
import { toContentProgressResponseDto } from './content-progress-response.transformer.js';

describe('toContentProgressResponseDto', () => {
  it('should return only the public progress fields', () => {
    const completedAt = new Date('2026-11-01T10:00:00.000Z');

    const progress = {
      id: 'progress-1',
      enrollmentId: 'enrollment-1',
      contentItemId: 'content-1',
      isCompleted: true,
      lastPositionSeconds: 90,
      completedAt,
      createdAt: completedAt,
      updatedAt: completedAt,
    } as ContentProgress;

    expect(toContentProgressResponseDto('content-1', progress)).toEqual({
      contentItemId: 'content-1',
      isCompleted: true,
      lastPositionSeconds: 90,
      completedAt,
    });
  });

  it('should return the starting values for content not started yet', () => {
    expect(toContentProgressResponseDto('content-1', null)).toEqual({
      contentItemId: 'content-1',
      isCompleted: false,
      lastPositionSeconds: 0,
      completedAt: null,
    });
  });
});
