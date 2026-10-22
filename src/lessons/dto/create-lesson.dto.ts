import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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

export class CreateLessonDto {
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
    enum: CourseDifficulty,
    example: CourseDifficulty.BEGINNER,
    description: 'Difficulty level of the lesson',
  })
  @IsOptional()
  @IsEnum(CourseDifficulty)
  difficulty?: CourseDifficulty;

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
