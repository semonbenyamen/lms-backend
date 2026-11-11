import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

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
