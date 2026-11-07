import { describe, expect, it } from 'vitest';

import { Category } from '../entities/category.entity.js';
import { toCategoryResponseDto } from './category-response.transformer.js';

describe('toCategoryResponseDto', () => {
  it('should return only the public category fields', () => {
    const createdAt = new Date('2026-11-01T10:00:00.000Z');
    const updatedAt = new Date('2026-11-02T10:00:00.000Z');

    const category = {
      id: 'category-1',
      name: 'Backend',
      createdAt,
      updatedAt,

      // Relations must not be exposed.
      courses: [],
    } as unknown as Category;

    expect(toCategoryResponseDto(category)).toEqual({
      id: 'category-1',
      name: 'Backend',
      createdAt,
      updatedAt,
    });
  });
});
