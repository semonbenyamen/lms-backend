import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ApiGetCourseProgress } from './course-progress.swagger.js';
import { CourseProgressService } from './course-progress.service.js';
import { CourseProgressResponseDto } from './dto/course-progress-response.dto.js';

// The course progress of the signed in student.
@ApiTags('Course Progress')
@Controller('courses')
@Auth(UserRole.STUDENT)
export class CourseProgressController {
  constructor(private readonly courseProgressService: CourseProgressService) {}

  @Get(':courseId/progress')
  @ApiGetCourseProgress()
  getCourseProgress(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<CourseProgressResponseDto> {
    return this.courseProgressService.getCourseProgress(
      request.user.sub,
      courseId,
    );
  }
}
