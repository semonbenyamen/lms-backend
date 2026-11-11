import { PartialType } from '@nestjs/swagger';

import { CreateContentItemDto } from './create-content-item.dto.js';

// null is validated, so a required field cannot be cleared with null.
export class UpdateContentItemDto extends PartialType(CreateContentItemDto, {
  skipNullProperties: false,
}) {}
