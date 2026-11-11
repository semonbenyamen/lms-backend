import { Controller, Get, Param, ParseUUIDPipe, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseProgressService } from './course-progress.service.js';

@ApiTags('Course Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
@Controller('courses')
export class CourseProgressController {
  constructor(private readonly courseProgressService: CourseProgressService) {}

  // Read the logged-in student's course completion summary.
  @Get(':courseId/progress')
  @ApiOperation({ summary: 'Get my course progress and completion' })
  @ApiParam({ name: 'courseId', type: String, format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Current course progress, calculated from non-deleted content',
    schema: {
      type: 'object',
      properties: {
        courseId: { type: 'string', format: 'uuid' },
        enrollmentId: { type: 'string', format: 'uuid' },
        totalLessons: { type: 'integer', example: 8 },
        lessonsCompleted: { type: 'integer', example: 3 },
        totalContents: { type: 'integer', example: 20 },
        completedContents: { type: 'integer', example: 7 },
        completionPercentage: { type: 'number', example: 35 },
        isCompleted: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid course UUID' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Student enrollment required' })
  @ApiResponse({ status: 404, description: 'Course not found or unpublished' })
  getCourseProgress(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.courseProgressService.getCourseProgress(request.user.sub, courseId);
  }
}
