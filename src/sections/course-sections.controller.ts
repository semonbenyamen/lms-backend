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
import { ApiResponseDto } from '../common/dto/api-response.dto.js';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { SectionsService } from './sections.service.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';
import { toSectionResponseDto } from './transformers/section-response.transformer.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';

// Routes that need the parent course: create and list.
@ApiTags('Sections')
@Controller('courses/:courseId/sections')
export class CourseSectionsController {
  constructor(private readonly sectionsService: SectionsService) { }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SectionOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a section to a course (Owner or Admin)',
  })

  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Section created successfully',
    type: ApiResponseDto,
  })

  // Shared error responses automatically include 401 Unauthorized.
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Course not found',
    [HttpStatus.CONFLICT]: 'orderIndex is already used in this course',
  })


  async create(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<void> {
    // Create the section without returning its data.
    await this.sectionsService.create(courseId, dto);
  }



  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all sections in a course' })
  @ApiSuccessResponse(SectionResponseDto, HttpStatus.OK, {
    isArray: true,
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.NOT_FOUND]: 'Course not found',
  })

  
async findByCourse(
  @Param('courseId', new ParseUUIDPipe()) courseId: string,
  @Req() request: AuthenticatedRequest,
): Promise<SectionResponseDto[]> {
  const sections = await this.sectionsService.findByCourse(
    courseId,
    {
      sub: request.user.sub,
      role: request.user.role,
    },
  );

  return sections.map(toSectionResponseDto);
}

}
