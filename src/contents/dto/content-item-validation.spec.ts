import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';

import { UpdateContentItemDto } from './update-content-item.dto.js';

const invalidFields = async (body: object): Promise<string[]> => {
  const errors = await validate(plainToInstance(UpdateContentItemDto, body));
  return errors.map((error) => error.property);
};

describe('UpdateContentItemDto', () => {
  it('should accept a partial update', async () => {
    expect(await invalidFields({ title: 'New title' })).toEqual([]);
  });

  it('should reject null for fields the database requires', async () => {
    expect(
      await invalidFields({
        title: null,
        contentType: null,
        orderIndex: null,
      }),
    ).toEqual(['title', 'contentType', 'orderIndex']);
  });

  it('should allow clearing optional fields with null', async () => {
    expect(await invalidFields({ durationSeconds: null })).toEqual([]);
  });
});
