import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { PaginatedResult } from '../common/pagintion/pagination.util.js';
import { CourseProgressService } from './course-progress.service.js';
import { MyEnrollmentResponseDto } from './dto/my-enrollment-response.dto.js';
import { ApiGetMyEnrollments } from './my-enrollments.swagger.js';

// The courses of the signed in student. It lives with the progress, because
// the progress module already uses the enrollments and not the other way.
@ApiTags('Enrollments')
@Controller('enrollments')
@Auth(UserRole.STUDENT)
export class MyEnrollmentsController {
  constructor(private readonly courseProgressService: CourseProgressService) {}

  @Get('me')
  @ApiGetMyEnrollments()
  findMyEnrollments(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResult<MyEnrollmentResponseDto>> {
    return this.courseProgressService.findMyEnrollments(
      request.user.sub,
      paginationQuery,
    );
  }
}
