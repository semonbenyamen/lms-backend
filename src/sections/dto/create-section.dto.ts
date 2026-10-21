import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateSectionDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Course ID (optional if provided as route param)',
  })
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @ApiProperty({
    example: 'Chapter 1: Getting Started',
    description: 'Title of the course section',
    minLength: 1,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 1,
    description: 'Order index of the section in the course',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;
}
