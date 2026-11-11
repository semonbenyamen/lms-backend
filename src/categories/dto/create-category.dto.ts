import { IsCategoryName } from '../decorators/is-category-name.decorator.js';
import { IsCategoryNameAvailable } from '../validators/is-category-name-available.validator.js';

export class CreateCategoryDto {
  @IsCategoryName()
  @IsCategoryNameAvailable()
  name: string;
}
