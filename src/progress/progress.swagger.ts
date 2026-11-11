import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ContentProgressResponseDto } from './dto/content-progress-response.dto.js';

const NOT_ENROLLED = 'Forbidden - only students enrolled in the course';
const NOT_FOUND = 'Content not found or its course is not published';

export const ApiGetContentProgress = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get my progress in a content item (Enrolled Student)',
      description:
        'Content the student has not started yet returns isCompleted false and position 0.',
    }),
    ApiSuccessResponse(ContentProgressResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
      [HttpStatus.FORBIDDEN]: NOT_ENROLLED,
      [HttpStatus.NOT_FOUND]: NOT_FOUND,
    }),
  );

export const ApiUpdateContentProgress = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update my progress in a content item (Enrolled Student)',
      description:
        'Mark any content as completed, or save the playback position of a video.',
    }),
    ApiSuccessResponse(ContentProgressResponseDto, HttpStatus.OK),
    ApiAuthErrorResponses({
      [HttpStatus.BAD_REQUEST]:
        'Invalid UUID, empty body, a position on content that is not a video, or a position past the video end',
      [HttpStatus.FORBIDDEN]: NOT_ENROLLED,
      [HttpStatus.NOT_FOUND]: NOT_FOUND,
    }),
  );
