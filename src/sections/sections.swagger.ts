import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { SectionResponseDto } from './dto/section-response.dto.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';
const ORDER_INDEX_USED = 'orderIndex is already used in this course';

export const ApiCreateSection = () =>
  applyDecorators(
    ApiOperation({ summary: 'Add a section to a course (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Section created successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiListSections = () =>
  applyDecorators(
    ApiOperation({ summary: 'List all sections in a course' }),
    ApiSuccessResponse(SectionResponseDto, HttpStatus.OK, { isArray: true }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Course not found',
    }),
  );

export const ApiGetSection = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get section details by ID' }),
    ApiSuccessResponse(SectionResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Section not found or unpublished',
    }),
  );

export const ApiUpdateSection = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a course section (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Section updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Section not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiDeleteSection = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a course section (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Section deleted successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Section not found',
    }),
  );
