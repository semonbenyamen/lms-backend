import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import { LessonsService } from './lessons.service.js';

// Routes that need the parent section: create and list.
@ApiTags('Lessons')
@Controller('sections/:sectionId/lessons')
export class SectionLessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, LessonOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new lesson in a section (Owner or Admin)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Lesson created successfully',
    type: ApiResponseDto,
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
    [HttpStatus.FORBIDDEN]: 'Forbidden - not course owner or admin',
    [HttpStatus.NOT_FOUND]: 'Section not found',
    [HttpStatus.CONFLICT]: 'orderIndex is already used in this section',
  })
  async create(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<void> {
    // Create the lesson without returning its data.
    await this.lessonsService.create(sectionId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all lessons in a section' })
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.OK, { isArray: true })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.NOT_FOUND]: 'Section not found',
  })
  async findBySection(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<LessonResponseDto[]> {
    return this.lessonsService.findBySection(sectionId, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }
}
