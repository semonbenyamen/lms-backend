import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ContentType } from '../../common/enums/content-type.enum.js';
import { CreateContentItemDto } from './create-content-item.dto.js';

describe('CreateContentItemDto', () => {
  // Form-data sends every field as a string.
  const formData = {
    title: 'Video Lecture',
    contentType: ContentType.VIDEO,
    orderIndex: '1',
  };

  it('should turn a single form-data tag into an array', async () => {
    const dto = plainToInstance(CreateContentItemDto, {
      ...formData,
      tags: 'nestjs',
    });

    expect(dto.tags).toEqual(['nestjs']);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should split comma-separated tags', () => {
    const dto = plainToInstance(CreateContentItemDto, {
      ...formData,
      tags: 'nestjs, backend,',
    });

    expect(dto.tags).toEqual(['nestjs', 'backend']);
  });

  it('should keep repeated form-data tags as an array', async () => {
    const dto = plainToInstance(CreateContentItemDto, {
      ...formData,
      tags: ['nestjs', 'backend'],
    });

    expect(dto.tags).toEqual(['nestjs', 'backend']);
    expect(dto.orderIndex).toBe(1);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('should reject tags that are not strings', async () => {
    const dto = plainToInstance(CreateContentItemDto, {
      ...formData,
      tags: [1, 2],
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('tags');
  });
});
