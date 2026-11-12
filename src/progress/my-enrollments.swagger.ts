import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { MyEnrollmentResponseDto } from './dto/my-enrollment-response.dto.js';

export const ApiGetMyEnrollments = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List my enrolled courses with my progress (Student)',
      description:
        'Cancelled enrollments are not listed. The progress is calculated from the live content of each course.',
    }),
    ApiSuccessResponse(MyEnrollmentResponseDto, HttpStatus.OK, {
      isPaginated: true,
    }),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid pagination query parameters',
      [HttpStatus.FORBIDDEN]: 'Forbidden - only students have enrollments',
    }),
  );
