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
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { PaginatedResult } from '../common/pagintion/pagination.util.js';
import {
  ApiCreateCourse,
  ApiDeleteCourse,
  ApiGetCourse,
  ApiListCourses,
  ApiUpdateCourse,
} from './courses.swagger.js';
import { CoursesService } from './courses.service.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseOwnershipGuard } from './guards/course-ownership.guard.js';
import { toCourseResponseDto } from './transformers/course-response.transformer.js';

@ApiTags('Courses')
@Controller('dashboard/courses')
@Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiCreateCourse()
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<IdResponseDto> {
    const { id } = await this.coursesService.create(
      createCourseDto,
      request.user.sub,
    );

    return { id };
  }

  @Get()
  @ApiListCourses()
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    const { items, meta } = await this.coursesService.findAll(
      paginationQuery,
      request.user,
    );

    return { items: items.map(toCourseResponseDto), meta };
  }

  // Routes with an id run CourseOwnershipGuard after the class guards.
  @Get(':id')
  @UseGuards(CourseOwnershipGuard)
  @ApiGetCourse()
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CourseResponseDto> {
    return toCourseResponseDto(await this.coursesService.findById(id));
  }

  @Patch(':id')
  @UseGuards(CourseOwnershipGuard)
  @ApiUpdateCourse()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<void> {
    return this.coursesService.update(id, updateCourseDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CourseOwnershipGuard)
  @ApiDeleteCourse()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.coursesService.remove(id);
  }
}
