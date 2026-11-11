import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LessonResponseDto } from '../../lessons/dto/lesson-response.dto.js';

export class SectionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  courseId: string;

  @ApiProperty({ example: 'Chapter 1: Getting Started' })
  title: string;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiPropertyOptional({ type: () => [LessonResponseDto] })
  lessons?: LessonResponseDto[];

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  updatedAt: Date;
}
