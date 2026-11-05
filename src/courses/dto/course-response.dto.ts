import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../../common/enums/course-language.enum.js';

export class CourseResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Course unique identifier',
  })
  id: string;

  @ApiProperty({
    example: 'NestJS Backend Architecture',
    description: 'The title of the course',
  })
  title: string;

  @ApiProperty({
    example:
      'An in-depth guide to building scalable NestJS enterprise applications.',
    description: 'The description of the course',
  })
  description: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440010',
    description: 'The category of the course, from GET /categories',
  })
  categoryId: string;

  @ApiProperty({
    example: ['NestJS', 'TypeORM', 'PostgreSQL'],
    description: 'List of topics covered in the course',
    type: [String],
  })
  topics: string[];

  @ApiProperty({
    enum: CourseDifficulty,
    example: CourseDifficulty.INTERMEDIATE,
    description: 'Difficulty level of the course',
  })
  difficulty: CourseDifficulty;

  @ApiProperty({
    enum: CourseLanguage,
    example: CourseLanguage.ENGLISH,
    description: 'Language of the course',
  })
  language: CourseLanguage;

  @ApiPropertyOptional({
    example: ['Basic TypeScript', 'Node.js fundamentals'],
    description: 'Prerequisites for taking the course',
    type: [String],
    nullable: true,
  })
  prerequisites: string[] | null;

  @ApiPropertyOptional({
    example: 120,
    description: 'Estimated duration in minutes',
    nullable: true,
  })
  estimatedDuration: number | null;

  @ApiProperty({
    example: false,
    description: 'Whether the course is published for student viewing',
  })
  isPublished: boolean;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Instructor ID who owns the course',
  })
  instructorId: string;

  @ApiProperty({
    example: '2026-10-11T00:00:00.000Z',
    type: String,
    format: 'date-time',
    description: 'Date and time when the course was created',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-10-11T00:00:00.000Z',
    type: String,
    format: 'date-time',
    description: 'Date and time when the course was last updated',
  })
  updatedAt: Date;
}
