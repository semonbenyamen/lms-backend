import { ApiProperty } from '@nestjs/swagger';

import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';

// The course fields the "my courses" page shows.
export class MyEnrollmentCourseDto {
  @ApiProperty({ example: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })
  id: string;

  @ApiProperty({ example: 'NestJS Fundamentals' })
  title: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/course.jpg',
    nullable: true,
  })
  thumbnailUrl: string | null;

  @ApiProperty({
    example: true,
    description: 'A draft course stays in the list but its content is closed',
  })
  isPublished: boolean;
}

export class MyEnrollmentResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Enrollment unique identifier',
  })
  id: string;

  @ApiProperty({
    enum: EnrollmentStatus,
    example: EnrollmentStatus.IN_PROGRESS,
    description: 'Calculated from the live content of the course',
  })
  status: EnrollmentStatus;

  @ApiProperty({
    example: 35,
    description: 'Completed content as a percentage, with two decimals',
  })
  completionPercentage: number;

  @ApiProperty({
    example: '2026-11-11T10:00:00.000Z',
    nullable: true,
    description: 'The last time the student made progress',
  })
  lastActivityAt: Date | null;

  @ApiProperty({
    example: '2026-11-01T10:00:00.000Z',
    description: 'The time the student enrolled',
  })
  enrolledAt: Date;

  @ApiProperty({ type: MyEnrollmentCourseDto })
  course: MyEnrollmentCourseDto;
}
