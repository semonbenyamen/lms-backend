import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';

const CATEGORY_NOT_FOUND = 'Category not found';
const INVALID_UUID = 'Invalid UUID format';

export const ApiListCategories = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Search categories, for course forms and filters',
    }),
    ApiSuccessResponse(CategoryResponseDto, HttpStatus.OK, {
      isPaginated: true,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid search or pagination query parameters',
    }),
  );

export const ApiGetCategory = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a category by ID' }),
    ApiSuccessResponse(CategoryResponseDto),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: INVALID_UUID,
      [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
    }),
  );

export const ApiCreateCategory = () =>
  applyDecorators(
    ApiOperation({ summary: 'Add a category (Instructor or Admin)' }),
    // The course form selects the new category with this id.
    ApiSuccessResponse(IdResponseDto, HttpStatus.CREATED),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]:
        'Invalid request body or the name already exists',
      [HttpStatus.FORBIDDEN]:
        'Forbidden - only instructors and admins can add categories',
      [HttpStatus.CONFLICT]:
        'Another request added the same name at the same time',
    }),
  );

export const ApiUpdateCategory = () =>
  applyDecorators(
    ApiOperation({ summary: 'Rename a category (Admin only)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Category updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format or request body',
      [HttpStatus.FORBIDDEN]: 'Forbidden - only admins can update categories',
      [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
      [HttpStatus.CONFLICT]: 'A category with this name already exists',
    }),
  );

export const ApiDeleteCategory = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete a category without active courses (Admin only)',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Category deleted successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: INVALID_UUID,
      [HttpStatus.FORBIDDEN]: 'Forbidden - only admins can delete categories',
      [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
      [HttpStatus.CONFLICT]: 'This category has active courses',
    }),
  );
