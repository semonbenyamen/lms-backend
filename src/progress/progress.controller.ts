
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { UpdateContentProgressDto } from './dto/update-content-progress.dto.js';
import { ProgressService } from './progress.service.js';

@ApiTags('Content Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  // Get progress for the logged-in student only.
  @Get('contents/:contentId')
  @ApiOperation({
    summary: 'Get my progress for a content item',
    description:
      'Returns the student progress record for content in an enrolled, published course. Returns null when no progress has been saved.',
  })
  @ApiParam({
    name: 'contentId',
    description: 'UUID of the content item',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress record or null if not started',
    schema: {
      nullable: true,
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        enrollmentId: { type: 'string', format: 'uuid' },
        contentItemId: { type: 'string', format: 'uuid' },
        isCompleted: { type: 'boolean' },
        lastPositionSeconds: { type: 'integer', example: 120 },
        completedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid content UUID' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Student access or enrollment required' })
  @ApiResponse({ status: 404, description: 'Content not found or unpublished' })
  getProgress(
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.getProgress(request.user.sub, contentId);
  }

  // Mark text/image as completed or save video playback position.
  @Patch('contents/:contentId')
  @ApiOperation({
    summary: 'Update my content progress',
    description:
      'Mark content as completed or update video playback position. Only enrolled students can update progress.',
  })
  @ApiParam({
    name: 'contentId',
    description: 'UUID of the content item',
    type: String,
    format: 'uuid',
  })
  @ApiBody({ type: UpdateContentProgressDto })
  @ApiResponse({
    status: 200,
    description: 'Updated progress record',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        enrollmentId: { type: 'string', format: 'uuid' },
        contentItemId: { type: 'string', format: 'uuid' },
        isCompleted: { type: 'boolean' },
        lastPositionSeconds: { type: 'integer', example: 120 },
        completedAt: {
          type: 'string',
          format: 'date-time',
          nullable: true,
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid UUID or progress data' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Student access or enrollment required' })
  @ApiResponse({ status: 404, description: 'Content not found or unpublished' })
  updateStudentContentProgress(
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() dto: UpdateContentProgressDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.progressService.updateStudentContentProgress(
      request.user.sub,
      contentId,
      dto,
    );
  }
}
