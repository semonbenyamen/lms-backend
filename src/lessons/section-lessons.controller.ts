import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import { ApiCreateLesson, ApiListLessons } from './lessons.swagger.js';
import { LessonsService } from './lessons.service.js';

// Routes that need the parent section: create and list.
@ApiTags('Lessons')
@Controller('sections/:sectionId/lessons')
export class SectionLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(LessonOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiCreateLesson()
  create(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<void> {
    return this.lessonsService.create(sectionId, dto);
  }

  @Get()
  @Auth()
  @ApiListLessons()
  findBySection(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LessonResponseDto[]> {
    return this.lessonsService.findBySection(sectionId, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }
}
