import { ApiProperty } from '@nestjs/swagger';

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
    nullable: true,
  })
  description: string | null;

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
