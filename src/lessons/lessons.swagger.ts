import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';
const ORDER_INDEX_USED = 'orderIndex is already used in this section';

export const ApiCreateLesson = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a new lesson in a section (Owner or Admin)',
    }),
    ApiResponse({
      status: HttpStatus.CREATED,
      description: 'Lesson created successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Section not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiListLessons = () =>
  applyDecorators(
    ApiOperation({ summary: 'List all lessons in a section' }),
    ApiSuccessResponse(LessonResponseDto, HttpStatus.OK, { isArray: true }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Section not found',
    }),
  );

export const ApiGetLesson = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get lesson details by ID' }),
    ApiSuccessResponse(LessonResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Lesson not found or unpublished',
    }),
  );

export const ApiUpdateLesson = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update a lesson (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Lesson updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Lesson not found',
      [HttpStatus.CONFLICT]: ORDER_INDEX_USED,
    }),
  );

export const ApiDeleteLesson = () =>
  applyDecorators(
    ApiOperation({ summary: 'Delete a lesson (Owner or Admin)' }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Lesson deleted successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Lesson not found',
    }),
  );
