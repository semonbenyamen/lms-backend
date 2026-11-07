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

import { ContentType } from '../../common/enums/content-type.enum.js';

// The lesson comes from the route, so it is not part of the body.
export class CreateContentItemDto {
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
    description:
      'Content type; text needs bodyText, video needs videoUrl and image needs imageUrl',
  })
  @IsEnum(ContentType, {
    message: 'contentType must be one of: text, video, image',
  })
  contentType: ContentType;

  @ApiPropertyOptional({
    example: '# Chapter Overview\nThis lecture covers controller decorators...',
    description: 'Text content, or the transcript of a video',
  })
  @IsOptional()
  @IsString()
  bodyText?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/videos/lecture-1.mp4',
    description: 'Link to the video, required for video content',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  videoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/images/diagram.png',
    description: 'Link to the image, required for image content',
    maxLength: 2048,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

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
