import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { PaginationQueryDto } from './pagination-query.dto.js';

describe('PaginationQueryDto', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const validate = (query: Record<string, string>) =>
    validationPipe.transform(query, {
      type: 'query',
      metatype: PaginationQueryDto,
    }) as Promise<PaginationQueryDto>;

  it('should use page 1 and limit 10 by default', async () => {
    await expect(validate({})).resolves.toEqual({ page: 1, limit: 10 });
  });

  it('should accept the maximum limit', async () => {
    await expect(validate({ limit: '100' })).resolves.toMatchObject({
      limit: 100,
    });
  });

  it.each([
    ['page below 1', { page: '0' }],
    ['limit below 1', { limit: '-5' }],
    ['limit above 100', { limit: '200' }],
    ['page that is not a number', { page: 'abc' }],
  ])('should reject %s', async (_name, query) => {
    await expect(validate(query)).rejects.toThrow(BadRequestException);
  });
});
