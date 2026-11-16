import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { CourseProgressResponseDto } from './dto/course-progress-response.dto.js';

export const ApiGetCourseProgress = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get my progress in a course (Enrolled Student)',
      description:
        'Calculated from the live content of the course, so deleted content does not count.',
    }),
    ApiSuccessResponse(CourseProgressResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]:
        'Forbidden - only students enrolled in the course',
      [HttpStatus.NOT_FOUND]: 'Course not found or not published',
    }),
  );
