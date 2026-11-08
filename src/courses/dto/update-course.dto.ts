import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto.js';

// Missing fields stay unchanged, but null is validated so it returns 400.
export class UpdateCourseDto extends PartialType(CreateCourseDto, {
  skipNullProperties: false,
}) {}
