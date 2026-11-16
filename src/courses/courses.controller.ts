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
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { PaginatedResult } from '../common/pagintion/pagination.util.js';
import {
  ApiCreateCourse,
  ApiCreateThumbnailSignature,
  ApiDeleteCourse,
  ApiGetCourse,
  ApiListCourses,
  ApiUpdateCourse,
  ApiUpdateCoursePublication,
} from './courses.swagger.js';
import { CoursesService } from './courses.service.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCoursePublicationDto } from './dto/update-course-publication.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CourseOwnershipGuard } from './guards/course-ownership.guard.js';

@ApiTags('Courses')
@Controller('dashboard/courses')
@Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @ApiCreateCourse()
  create(
    @Body() createCourseDto: CreateCourseDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<IdResponseDto> {
    return this.coursesService.create(createCourseDto, request.user.sub);
  }

  @Get()
  @ApiListCourses()
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    return this.coursesService.findAll(paginationQuery, request.user);
  }

  // Routes with an id run CourseOwnershipGuard after the class guards.
  @Get(':id')
  @UseGuards(CourseOwnershipGuard)
  @ApiGetCourse()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CourseResponseDto> {
    return this.coursesService.getCourse(id);
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

  // One endpoint publishes and unpublishes, like the assessments.
  @Patch(':id/publication')
  @UseGuards(CourseOwnershipGuard)
  @ApiUpdateCoursePublication()
  updatePublication(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePublicationDto: UpdateCoursePublicationDto,
  ): Promise<void> {
    return this.coursesService.setPublication(id, updatePublicationDto);
  }

  // Signing an image upload creates nothing here, so it returns 200.
  @Post(':id/thumbnail-signature')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CourseOwnershipGuard)
  @ApiCreateThumbnailSignature()
  createThumbnailSignature(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): UploadSignatureResponseDto {
    return this.coursesService.createThumbnailSignature(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(CourseOwnershipGuard)
  @ApiDeleteCourse()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.coursesService.remove(id);
  }
}
