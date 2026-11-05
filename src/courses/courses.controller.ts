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
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { CoursesService } from './courses.service.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseOwnershipGuard } from './guards/course-ownership.guard.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';

@ApiTags('Courses')
@Controller('dashboard/courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new course (Instructor or Admin)',
  })
  @ApiSuccessResponse(CourseResponseDto, HttpStatus.CREATED)
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or validation failed',
    [HttpStatus.FORBIDDEN]:
      'Forbidden - only instructors and admins can create courses',
    [HttpStatus.NOT_FOUND]: 'Category not found',
  })
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.coursesService.create(createCourseDto, request.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List courses for the dashboard (Admin all, Instructor own)',
  })
  @ApiSuccessResponse(CourseResponseDto, HttpStatus.OK, { isPaginated: true })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid pagination query parameters',
    [HttpStatus.FORBIDDEN]:
      'Forbidden - only instructors and admins can list courses',
  })
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.coursesService.findAll(paginationQuery, request.user);
  }

  @Get(':id')
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, CourseOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get course details by ID (Course Owner or Admin)',
  })
  @ApiSuccessResponse(CourseResponseDto, HttpStatus.OK)
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Course not found',
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    // Ownership is verified by CourseOwnershipGuard.
    return this.coursesService.findById(id);
  }

  @Patch(':id')
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, CourseOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a course by ID (Course Owner or Admin)',
  })
  @ApiSuccessResponse(CourseResponseDto, HttpStatus.OK)
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Course or category not found',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    // Ownership is verified by CourseOwnershipGuard.
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, CourseOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Soft delete a course by ID (Course Owner or Admin)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Course soft deleted successfully',
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Course not found',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    // Ownership is verified by CourseOwnershipGuard.
    return this.coursesService.remove(id);
  }
}
