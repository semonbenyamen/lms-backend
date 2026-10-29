import {
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';

@ApiTags('Courses', 'Enrollments')
@Controller('courses')
export class CourseEnrollmentController {
  constructor(private readonly coordinator: CourseEnrollmentCoordinator) {}

  @Post(':courseId/enroll')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enroll a student in a published course',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'New enrollment created',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student already enrolled',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Course not found or unpublished',
  })
  async enroll(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.coordinator.enroll(request.user.sub, courseId);

    response.status(result.created ? HttpStatus.CREATED : HttpStatus.OK);

    return result.enrollment;
  }
}
