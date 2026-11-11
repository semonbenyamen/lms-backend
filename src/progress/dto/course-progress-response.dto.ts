import { ApiProperty } from '@nestjs/swagger';

export class CourseProgressResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The course this progress belongs to',
  })
  courseId: string;

  @ApiProperty({
    example: 8,
    description: 'Lessons that have content',
  })
  totalLessons: number;

  @ApiProperty({
    example: 3,
    description: 'Lessons whose content is all completed',
  })
  lessonsCompleted: number;

  @ApiProperty({ example: 20, description: 'Content items in the course' })
  totalContents: number;

  @ApiProperty({
    example: 7,
    description: 'Content items the student completed',
  })
  completedContents: number;

  @ApiProperty({
    example: 35,
    description: 'Completed content as a percentage, with two decimals',
  })
  completionPercentage: number;

  @ApiProperty({
    example: false,
    description: 'Whether every content item in the course is completed',
  })
  isCompleted: boolean;
}
