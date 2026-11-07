import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CategoriesService } from '../categories.service.js';
import { IsCategoryNameAvailableConstraint } from '../validators/is-category-name-available.validator.js';
import { CreateCategoryDto } from './create-category.dto.js';
import { UpdateCategoryDto } from './update-category.dto.js';

describe('Category DTO Validation', () => {
  const isNameAvailable = vi.fn();

  const constraint = new IsCategoryNameAvailableConstraint({
    isNameAvailable,
  } as unknown as CategoriesService);

  useContainer(
    {
      get: <T>(someClass: new () => T): T =>
        (someClass as unknown) === IsCategoryNameAvailableConstraint
          ? (constraint as T)
          : new someClass(),
    },
    { fallbackOnErrors: true },
  );

  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const validateCreate = (body: unknown) =>
    validationPipe.transform(body, {
      type: 'body',
      metatype: CreateCategoryDto,
    });

  const validateUpdate = (body: unknown) =>
    validationPipe.transform(body, {
      type: 'body',
      metatype: UpdateCategoryDto,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    isNameAvailable.mockResolvedValue(true);
  });

  describe('create', () => {
    it('should accept an available name and trim it', async () => {
      await expect(validateCreate({ name: '  Backend  ' })).resolves.toEqual({
        name: 'Backend',
      });
      expect(isNameAvailable).toHaveBeenCalledWith('Backend');
    });

    it('should reject a name that already exists', async () => {
      isNameAvailable.mockResolvedValue(false);

      await expect(validateCreate({ name: 'Backend' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it.each([
      ['missing', {}],
      ['null', { name: null }],
      ['empty', { name: '   ' }],
    ])('should reject a %s name', async (_case, body) => {
      await expect(validateCreate(body)).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('should allow an update without a name', async () => {
      await expect(validateUpdate({})).resolves.toEqual({});
    });

    it('should leave the name check to the service', async () => {
      await expect(validateUpdate({ name: ' Backend ' })).resolves.toEqual({
        name: 'Backend',
      });
      expect(isNameAvailable).not.toHaveBeenCalled();
    });

    it.each([
      ['null', { name: null }],
      ['empty', { name: '   ' }],
    ])('should reject a %s name', async (_case, body) => {
      await expect(validateUpdate(body)).rejects.toThrow(BadRequestException);
    });
  });
});
