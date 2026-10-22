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
  MaxLength,
  Min,
} from 'class-validator';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';

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
    example: 'Backend Development',
    description: 'The category of the course',
    maxLength: 100,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Category must not be empty' })
  @MaxLength(100)
  category: string;

  @ApiProperty({
    example: ['NestJS', 'TypeORM', 'PostgreSQL', 'Architecture'],
    description: 'List of topics covered in the course',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty({ message: 'Topics must contain at least one topic' })
  topics: string[];

  @ApiPropertyOptional({
    enum: CourseDifficulty,
    example: CourseDifficulty.INTERMEDIATE,
    description: 'Difficulty level of the course',
  })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Language of instruction',
    default: 'en',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

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
