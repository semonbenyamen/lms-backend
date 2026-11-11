import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { UpdateLessonDto } from './update-lesson.dto.js';

const invalidFields = async (body: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(UpdateLessonDto, body));
  return errors.map((error) => error.property);
};

describe('UpdateLessonDto', () => {
  it('should accept a partial update', async () => {
    expect(await invalidFields({ title: 'New title' })).toEqual([]);
  });

  it('should accept an empty body', async () => {
    expect(await invalidFields({})).toEqual([]);
  });

  it('should reject null for fields the database requires', async () => {
    expect(await invalidFields({ title: null, orderIndex: null })).toEqual([
      'title',
      'orderIndex',
    ]);
  });

  it('should reject an empty title', async () => {
    expect(await invalidFields({ title: '   ' })).toEqual(['title']);
  });
});
