import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto.js';

export const ApiEnrollInCourse = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Enroll in a published course (Student)',
      description:
        'Returns 201 with the new enrollment, or 200 with the existing one if the student is already enrolled.',
    }),
    ApiSuccessResponse(EnrollmentResponseDto, HttpStatus.CREATED),
    ApiSuccessResponse(EnrollmentResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: 'Forbidden - only students can enroll',
      [HttpStatus.NOT_FOUND]: 'Course not found or unpublished',
    }),
  );

export const ApiCancelEnrollment = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Cancel my enrollment in a course (Student)',
      description: 'The progress is kept, so enrolling again brings it back.',
    }),
    ApiResponse({
      status: HttpStatus.NO_CONTENT,
      description: 'Enrollment cancelled successfully',
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: 'Forbidden - only students can cancel',
      [HttpStatus.NOT_FOUND]: 'No active enrollment in this course',
    }),
  );
