import { PartialType } from '@nestjs/swagger';
import { CreateLessonDto } from './create-lesson.dto.js';

// Missing fields stay unchanged, but null is validated so it returns 400.
export class UpdateLessonDto extends PartialType(CreateLessonDto, {
  skipNullProperties: false,
}) {}
