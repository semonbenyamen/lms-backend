import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../../common/enums/course-language.enum.js';

export class CreateCourseDto {
  @ApiProperty({
    example: 'NestJS Backend Architecture',
    description: 'The title of the course',
    minLength: 1,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty or whitespace-only' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example:
      'An in-depth guide to building scalable NestJS enterprise applications.',
    description: 'The description of the course',
    maxLength: 5000,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Description must not be empty' })
  @MaxLength(5000)
  description: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'One of the categories from GET /categories',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    example: ['NestJS', 'TypeORM', 'PostgreSQL', 'Architecture'],
    description: 'List of topics covered in the course',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty({ message: 'Topics must contain at least one topic' })
  topics: string[];

  @ApiProperty({
    enum: CourseDifficulty,
    example: CourseDifficulty.INTERMEDIATE,
    description: 'Difficulty level of the course',
  })
  @IsEnum(CourseDifficulty)
  difficulty: CourseDifficulty;

  @ApiProperty({
    enum: CourseLanguage,
    example: CourseLanguage.ENGLISH,
    description: 'Language of instruction',
  })
  @IsEnum(CourseLanguage)
  language: CourseLanguage;

  @ApiPropertyOptional({
    example: ['Basic TypeScript', 'Node.js fundamentals'],
    description: 'Prerequisites for taking the course',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisites?: string[];

  @ApiPropertyOptional({
    example: 120,
    description: 'Estimated duration in minutes',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  // Prevent negative course durations.
  @Min(0)
  estimatedDuration?: number;
}
