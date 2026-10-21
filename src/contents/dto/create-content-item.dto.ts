import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

import { ContentType } from '../../common/enums/content-type.enum.js';

export class CreateContentItemDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440003',
    description: 'Lesson ID (optional if provided as route param)',
  })
  @IsOptional()
  @IsUUID()
  lessonId?: string;

  @ApiProperty({
    example: 'Video Lecture: Setting up NestJS',
    description: 'Title of the content item',
    minLength: 1,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    enum: ContentType,
    example: ContentType.VIDEO,
    description: 'Content type (text, video, quiz, resource)',
  })
  @IsEnum(ContentType, {
    message: 'contentType must be one of: text, video, quiz, resource',
  })
  contentType: ContentType;

  @ApiPropertyOptional({
    example: 'mp4',
    description: 'Subtype of the content (e.g. mp4, markdown, pdf)',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contentSubtype?: string;

  @ApiPropertyOptional({
    example: '# Chapter Overview\nThis lecture covers controller decorators...',
    description: 'Body text for text or resource content items',
  })
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/videos/lecture-1.mp4',
    description: 'Storage URL reference for video content',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  @ApiPropertyOptional({
    example: 640,
    description: 'Duration in seconds for video or audio items',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @ApiPropertyOptional({
    example: 'en',
    description: 'Language of the content item',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @ApiProperty({
    example: 1,
    description: 'Order index of the content item within the lesson',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;

  @ApiPropertyOptional({
    example: ['nestjs', 'setup', 'tutorial'],
    description: 'Tags associated with the content item',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
