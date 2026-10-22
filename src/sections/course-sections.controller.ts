import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { SectionsService } from './sections.service.js';

// Routes that need the parent course: create and list.
@ApiTags('Sections')
@Controller('courses/:courseId/sections')
export class CourseSectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a section to a course (Owner or Admin)' })
  @ApiSuccessResponse(SectionResponseDto, HttpStatus.CREATED)
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
    description: 'Course not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'orderIndex is already used in this course',
  })
  create(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateSectionDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.sectionsService.create(courseId, dto, request.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all sections in a course' })
  @ApiSuccessResponse(SectionResponseDto, HttpStatus.OK, { isArray: true })
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
    description: 'Course not found',
  })
  findByCourse(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
    @Query() paginationQuery?: PaginationQueryDto,
  ) {
    return this.sectionsService.findByCourse(
      courseId,
      request.user,
      paginationQuery,
    );
  }
}
