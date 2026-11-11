import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Shared by the create and update DTOs. class-validator drops inherited rules
// when a child class adds its own to the same property, so they can't be inherited.
export function IsCategoryName() {
  return applyDecorators(
    ApiProperty({
      example: 'Backend Development',
      description: 'Category name, unique regardless of letter case',
      maxLength: 100,
    }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString(),
    IsNotEmpty({ message: 'Name must not be empty' }),
    MaxLength(100),
  );
}
