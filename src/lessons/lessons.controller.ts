import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import {
  ApiDeleteLesson,
  ApiGetLesson,
  ApiUpdateLesson,
} from './lessons.swagger.js';
import { LessonsService } from './lessons.service.js';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  @Auth()
  @ApiGetLesson()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LessonResponseDto> {
    return this.lessonsService.getLesson(id, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }

  @Patch(':id')
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(LessonOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiUpdateLesson()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<void> {
    return this.lessonsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(LessonOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiDeleteLesson()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.lessonsService.remove(id);
  }
}
