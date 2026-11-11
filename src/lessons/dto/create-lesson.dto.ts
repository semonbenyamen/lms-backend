import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({
    example: 'Lesson 1: Introduction to Controllers',
    description: 'Title of the lesson',
    minLength: 1,
    maxLength: 255,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(255)
  title: string;

  @ApiProperty({
    example: 1,
    description: 'Order index of the lesson within the section/module',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  orderIndex: number;
}
