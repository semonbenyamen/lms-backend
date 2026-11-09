import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { UpdateSectionDto } from './update-section.dto.js';

describe('Section DTO Validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const validateUpdate = (body: Record<string, unknown>) =>
    validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateSectionDto,
    });

  it('should reject null title', async () => {
    // Null must be rejected before reaching the database.
    await expect(validateUpdate({ title: null })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should reject null orderIndex', async () => {
    await expect(validateUpdate({ orderIndex: null })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should accept orderIndex 0', async () => {
    // Zero is a valid section position.
    await expect(validateUpdate({ orderIndex: 0 })).resolves.toMatchObject({
      orderIndex: 0,
    });
  });

  it('should allow partial updates', async () => {
    await expect(
      validateUpdate({ title: 'Updated Section' }),
    ).resolves.toMatchObject({ title: 'Updated Section' });
  });
});
