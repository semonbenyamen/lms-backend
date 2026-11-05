import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { CreateCourseDto } from './create-course.dto.js';
import { UpdateCourseDto } from './update-course.dto.js';

describe('Course DTO Validation', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  const validCourse = {
    title: 'NestJS Backend Architecture',
    description: 'Learn NestJS backend development',
    categoryId: '550e8400-e29b-41d4-a716-446655440010',
    topics: ['NestJS', 'TypeScript'],
    difficulty: CourseDifficulty.BEGINNER,
  };

  it('should reject a category that is not an id', async () => {
    await expect(
      validationPipe.transform(
        { ...validCourse, categoryId: 'Backend Development' },
        { type: 'body', metatype: CreateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject a language outside the supported list', async () => {
    await expect(
      validationPipe.transform(
        { ...validCourse, language: 'english' },
        { type: 'body', metatype: CreateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should accept valid course creation data', async () => {
    const result = await validationPipe.transform(validCourse, {
      type: 'body',
      metatype: CreateCourseDto,
    });

    expect(result).toBeInstanceOf(CreateCourseDto);
    expect(result).toMatchObject(validCourse);
  });

  it('should reject a course without a difficulty', async () => {
        await expect(
      validationPipe.transform({ ...validCourse, difficulty: undefined }, {
        type: 'body',
        metatype: CreateCourseDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow updating a course without a difficulty', async () => {
    await expect(
      validationPipe.transform(
        { title: 'Updated title' },
        { type: 'body', metatype: UpdateCourseDto },
      ),
    ).resolves.toMatchObject({ title: 'Updated title' });
  });

  it('should reject isPublished during course creation', async () => {
    // Publishing must not be controlled through the create DTO.
    await expect(
      validationPipe.transform(
        { ...validCourse, isPublished: true },
        { type: 'body', metatype: CreateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject isPublished during course updates', async () => {
    // Publishing requires a separate workflow with content checks.
    await expect(
      validationPipe.transform(
        { isPublished: true },
        { type: 'body', metatype: UpdateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject negative estimated duration', async () => {
    await expect(
      validationPipe.transform(
        { ...validCourse, estimatedDuration: -10 },
        { type: 'body', metatype: CreateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject an empty course title', async () => {
    await expect(
      validationPipe.transform(
        { ...validCourse, title: '   ' },
        { type: 'body', metatype: CreateCourseDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
