import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    example: 'NestJS Backend Architecture',
    description: 'The title of the course',
    minLength: 1,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty or whitespace-only' })
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    example:
      'An in-depth guide to building scalable NestJS enterprise applications.',
    description: 'The description of the course',
    maxLength: 5000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;
}
