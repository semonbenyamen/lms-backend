import { Injectable } from '@nestjs/common';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { CategoriesService } from '../categories.service.js';

@ValidatorConstraint({ name: 'isCategoryNameAvailable', async: true })
@Injectable()
export class IsCategoryNameAvailableConstraint implements ValidatorConstraintInterface {
  constructor(private readonly categoriesService: CategoriesService) {}

  async validate(name: unknown): Promise<boolean> {
    // The other rules on the field report a name that isn't a string.
    if (typeof name !== 'string') {
      return true;
    }

    return this.categoriesService.isNameAvailable(name);
  }

  defaultMessage(): string {
    return 'A category with this name already exists';
  }
}

export function IsCategoryNameAvailable(options?: ValidationOptions) {
  return (target: object, propertyName: string): void => {
    registerDecorator({
      target: target.constructor,
      propertyName,
      options,
      validator: IsCategoryNameAvailableConstraint,
    });
  };
}
