import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';

export class EnrollmentResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Enrollment unique identifier',
  })
  id: string;

  @ApiProperty({
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    description: 'The enrolled course',
  })
  courseId: string;

  @ApiProperty({
    enum: EnrollmentStatus,
    example: EnrollmentStatus.NOT_STARTED,
    description: 'The student progress status in the course',
  })
  status: EnrollmentStatus;

  @ApiProperty({
    example: 0,
    description: 'Completed part of the course, from 0 to 100',
  })
  completionPercentage: number;

  @ApiProperty({ example: 0, description: 'Number of completed lessons' })
  lessonsCompleted: number;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'The last time the student made progress',
  })
  lastActivityAt: Date | null;

  @ApiPropertyOptional({
    example: null,
    nullable: true,
    description: 'The time the student completed the course',
  })
  completedAt: Date | null;

  @ApiProperty({
    example: '2026-11-11T10:00:00.000Z',
    description: 'The time the student enrolled',
  })
  enrolledAt: Date;
}
