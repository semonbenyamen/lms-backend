import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

import { CreateCourseDto } from './create-course.dto.js';

// Missing fields stay unchanged, but null is validated so it returns 400.
export class UpdateCourseDto extends PartialType(CreateCourseDto, {
  skipNullProperties: false,
}) {
  // Only on update, because the course must exist to sign its upload.
  @ApiPropertyOptional({
    example:
      'lms/courses/550e8400-e29b-41d4-a716-446655440000/thumbnail/9b2f...',
    description:
      'publicId from the thumbnail signature after the image is uploaded, or null to remove the thumbnail',
    maxLength: 255,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  thumbnailPublicId?: string | null;
}
