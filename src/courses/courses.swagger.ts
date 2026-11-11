import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { CourseResponseDto } from './dto/course-response.dto.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';

export const ApiCreateCourse = () =>
  applyDecorators(
    ApiOperation({ summary: 'Create a new course (Instructor or Admin)' }),
    // The frontend opens the new course page with this id.
    ApiSuccessResponse(IdResponseDto, HttpStatus.CREATED),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid request body or validation failed',
      [HttpStatus.FORBIDDEN]:
        'Forbidden - only instructors and admins can create courses',
      [HttpStatus.NOT_FOUND]: 'Category not found',
    }),
  );

export const ApiListCourses = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List courses for the dashboard (Admin all, Instructor own)',
    }),
    ApiSuccessResponse(CourseResponseDto, HttpStatus.OK, { isPaginated: true }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid pagination query parameters',
      [HttpStatus.FORBIDDEN]:
        'Forbidden - only instructors and admins can list courses',
    }),
  );

export const ApiGetCourse = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get course details by ID (Course Owner or Admin)',
    }),
    ApiSuccessResponse(CourseResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course not found',
    }),
  );

export const ApiUpdateCourse = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update a course by ID (Course Owner or Admin)',
      description:
        'To set the thumbnail, upload the image with the thumbnail signature, then send its publicId as thumbnailPublicId.',
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Course updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]:
        'Invalid request body, UUID format or uploaded thumbnail',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course or category not found',
    }),
  );

export const ApiCreateThumbnailSignature = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Sign a thumbnail upload to Cloudinary for a course (Course Owner or Admin)',
      description:
        'Upload the image to Cloudinary with these values, then send publicId as thumbnailPublicId in the course update.',
    }),
    ApiSuccessResponse(UploadSignatureResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course not found',
    }),
  );

export const ApiDeleteCourse = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Soft delete a course by ID (Course Owner or Admin)',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Course soft deleted successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course not found',
    }),
  );
