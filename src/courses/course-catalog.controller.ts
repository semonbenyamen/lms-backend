import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { PaginatedResult } from '../common/pagintion/pagination.util.js';
import {
  ApiGetCatalogCourse,
  ApiListCatalogCourses,
} from './courses.swagger.js';
import { CoursesService } from './courses.service.js';
import { CourseResponseDto } from './dto/course-response.dto.js';

// Public routes: visitors browse the published courses before signing up.
@ApiTags('Courses')
@Controller('courses')
export class CourseCatalogController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @ApiListCatalogCourses()
  findAll(
    @Query() paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    return this.coursesService.findPublished(paginationQuery);
  }

  @Get(':id')
  @ApiGetCatalogCourse()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CourseResponseDto> {
    return this.coursesService.getPublishedCourse(id);
  }
}
