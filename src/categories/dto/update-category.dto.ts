import { PartialType } from '@nestjs/swagger';

import { IsCategoryName } from '../decorators/is-category-name.decorator.js';

// The name check needs the id from the URL, so the service does it on update.
class CategoryNameDto {
  @IsCategoryName()
  name: string;
}

export class UpdateCategoryDto extends PartialType(CategoryNameDto, {
  // The name column doesn't accept null, so only a missing name is skipped.
  skipNullProperties: false,
}) {}
