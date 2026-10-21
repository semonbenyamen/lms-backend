import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateLessonDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440002',
    description: 'Section ID that this lesson belongs to',
  })
  @IsOptional()
  @IsUUID()
  sectionId?: string;

  @ApiProperty({
    example: 'Lesson 1: Introduction to Controllers',
    description: 'Title of the lesson',
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
    description: 'Order index of the lesson within the section/module',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({
    example: 'Routing and Request Handling',
    description: 'Specific topic covered by the lesson',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  topic?: string;

  @ApiPropertyOptional({
    example: 'beginner',
    description: 'Difficulty level of the lesson',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  difficulty?: string;

  @ApiPropertyOptional({
    example: ['Basic TypeScript'],
    description: 'Prerequisites for this specific lesson',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];
}
