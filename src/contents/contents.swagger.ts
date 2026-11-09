import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';
const ORDER_INDEX_USED = 'orderIndex is already used in this lesson';
const INVALID_BODY =
  'Invalid request body, UUID format or missing field of the content type';

export const ApiCreateContent = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Add a content item to a lesson (Owner or Admin)',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Content item created successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: INVALID_BODY,
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Lesson not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiListContents = () =>
  applyDecorators(
    ApiOperation({ summary: 'List all content items for a lesson' }),
    ApiSuccessResponse(ContentItemResponseDto, HttpStatus.OK, {
      isArray: true,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Lesson not found or unpublished',
    }),
  );

export const ApiGetContent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get content item details by ID' }),
    ApiSuccessResponse(ContentItemResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Content item not found or unpublished',
    }),
  );

export const ApiUpdateContent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a content item (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Content item updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: INVALID_BODY,
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Content item not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiDeleteContent = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a content item (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Content item soft deleted successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Content item not found',
    }),
  );
