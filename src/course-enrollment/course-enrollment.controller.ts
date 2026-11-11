import {
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { EnrollmentResponseDto } from '../enrollments/dto/enrollment-response.dto.js';
import { toEnrollmentResponseDto } from '../enrollments/transformers/enrollment-response.transformer.js';
import { CourseEnrollmentCoordinator } from './course-enrollment.coordinator.js';
import { ApiEnrollInCourse } from './course-enrollment.swagger.js';

@ApiTags('Enrollments')
@Controller('courses')
export class CourseEnrollmentController {
  constructor(private readonly coordinator: CourseEnrollmentCoordinator) {}

  @Post(':courseId/enroll')
  @Auth(UserRole.STUDENT)
  @ApiEnrollInCourse()
  async enroll(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<EnrollmentResponseDto> {
    const { enrollment, created } = await this.coordinator.enroll(
      request.user.sub,
      courseId,
    );

    // 201 for a new enrollment, 200 when the student was already enrolled.
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return toEnrollmentResponseDto(enrollment);
  }
}
