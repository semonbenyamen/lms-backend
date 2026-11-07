import { ApiProperty } from '@nestjs/swagger';

export class LessonResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  sectionId: string;

  @ApiProperty({ example: 'Lesson 1: Introduction to Controllers' })
  title: string;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  updatedAt: Date;
}
