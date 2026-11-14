import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';

import {
  ApiAuthErrorResponses,
  ApiErrorResponses,
} from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { UpdateCoursePublicationDto } from './dto/update-course-publication.dto.js';

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

export const ApiUpdateCoursePublication = () =>
  applyDecorators(
    ApiOperation({
      summary:
        'Publish a course to the catalog or take it back to draft (Course Owner or Admin)',
    }),
    ApiBody({
      type: UpdateCoursePublicationDto,
      examples: {
        publish: { summary: 'Publish', value: { isPublished: true } },
        unpublish: {
          summary: 'Unpublish (no enrolled students)',
          value: { isPublished: false },
        },
        unpublishWithEnrollments: {
          summary: 'Unpublish a course with enrolled students',
          value: { isPublished: false, confirmUnpublishWithEnrollments: true },
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.OK,
      description: 'Course publication updated successfully',
      type: ApiResponseDto,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format or request body',
      [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
      [HttpStatus.NOT_FOUND]: 'Course not found',
      [HttpStatus.CONFLICT]:
        'Unpublishing a course with enrolled students needs confirmUnpublishWithEnrollments',
      [HttpStatus.UNPROCESSABLE_ENTITY]:
        'Publishing needs at least one section, lesson and content',
    }),
  );

// The catalog is public, so these endpoints have no 401 or 403.
export const ApiListCatalogCourses = () =>
  applyDecorators(
    ApiOperation({ summary: 'List the published courses (Public)' }),
    ApiSuccessResponse(CourseResponseDto, HttpStatus.OK, { isPaginated: true }),
    ApiErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid pagination query parameters',
    }),
  );

export const ApiGetCatalogCourse = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get a published course with its sections and lessons (Public)',
      description: 'Content is not included, it needs an enrollment.',
    }),
    ApiSuccessResponse(CourseResponseDto, HttpStatus.OK),
    ApiErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.NOT_FOUND]: 'Course not found or not published',
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
      [HttpStatus.CONFLICT]: 'Cannot delete a course with active enrollments',
    }),
  );
