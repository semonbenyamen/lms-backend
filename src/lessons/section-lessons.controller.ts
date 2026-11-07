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
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import { LessonsService } from './lessons.service.js';
import { toLessonResponseDto } from './transformers/lesson-response.transformer.js';

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
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - not course owner or admin',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Section not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'orderIndex is already used in this section',
  })
  async create(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Body() dto: CreateLessonDto,
  ) {
    const lesson = await this.lessonsService.create(sectionId, dto);

    return toLessonResponseDto(lesson);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all lessons in a section' })
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.OK, { isArray: true })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Section not found',
  })
  async findBySection(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const { sub, role } = request.user;
    const lessons = await this.lessonsService.findBySection(sectionId, {
      sub,
      role,
    });

    return lessons.map(toLessonResponseDto);
  }
}
