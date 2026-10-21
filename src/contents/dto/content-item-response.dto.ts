import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContentItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440004' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  lessonId: string;

  @ApiProperty({ example: 'Video Lecture: Setting up NestJS' })
  title: string;

  @ApiProperty({ example: 'video', enum: ['text', 'video', 'quiz', 'resource'] })
  contentType: string;

  @ApiPropertyOptional({ example: 'mp4', nullable: true })
  contentSubtype?: string | null;

  @ApiPropertyOptional({ example: 'Lecture notes...', nullable: true })
  bodyText?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/videos/lecture-1.mp4',
    nullable: true,
  })
  videoUrl?: string | null;

  @ApiPropertyOptional({ example: 640, nullable: true })
  durationSeconds?: number | null;

  @ApiPropertyOptional({ example: 'en', nullable: true })
  language?: string | null;

  @ApiProperty({ example: 1 })
  orderIndex: number;

  @ApiPropertyOptional({ example: ['nestjs', 'setup'], type: [String] })
  tags?: string[];

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-10-11T00:00:00.000Z' })
  updatedAt: Date;
}
