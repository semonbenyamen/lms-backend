import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { LessonsService } from './lessons.service.js';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('sections/:sectionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new lesson in a section (Owner or Admin)' })
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
  create(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Body() dto: CreateLessonDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lessonsService.create(sectionId, dto, request.user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a lesson (with sectionId in body)' })
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or missing sectionId',
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
  createDirect(
    @Body() dto: CreateLessonDto,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!dto.sectionId) {
      throw new BadRequestException('sectionId is required in request body');
    }
    return this.lessonsService.create(dto.sectionId, dto, request.user);
  }

  @Get('sections/:sectionId')
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
  findBySection(
    @Param('sectionId', new ParseUUIDPipe()) sectionId: string,
    @Req() request: AuthenticatedRequest,
    @Query() paginationQuery?: PaginationQueryDto,
  ) {
    return this.lessonsService.findBySection(
      sectionId,
      request.user,
      paginationQuery,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lesson details by ID with content items' })
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.OK)
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
    description: 'Lesson not found or unpublished',
  })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lessonsService.findById(id, request.user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson (Owner or Admin)' })
  @ApiSuccessResponse(LessonResponseDto, HttpStatus.OK)
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
    description: 'Lesson not found',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lessonsService.update(id, dto, request.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a lesson (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Lesson deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
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
    description: 'Lesson not found',
  })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.lessonsService.remove(id, request.user);
  }
}