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
import { ContentsService } from './contents.service.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { CreateContentItemDto } from './dto/create-content-item.dto.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';

// Routes that need the parent lesson: create and list.
@ApiTags('Contents')
@Controller('lessons/:lessonId/contents')
export class LessonContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post()
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, ContentOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a content item to a lesson (Owner or Admin)' })
  @ApiSuccessResponse(ContentItemResponseDto, HttpStatus.CREATED)
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
  create(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: CreateContentItemDto,
  ) {
    return this.contentsService.create(lessonId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all content items for a lesson' })
  @ApiSuccessResponse(ContentItemResponseDto, HttpStatus.OK, { isArray: true })
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
    description: 'Lesson not found',
  })
  findByLesson(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Req() request: AuthenticatedRequest,
    @Query() paginationQuery?: PaginationQueryDto,
  ) {
    return this.contentsService.findByLesson(
      lessonId,
      request.user,
      paginationQuery,
    );
  }
}
