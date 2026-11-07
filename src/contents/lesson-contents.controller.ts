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
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import { ContentsService } from './contents.service.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { CreateContentItemDto } from './dto/create-content-item.dto.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';
import { toContentItemResponseDto } from './transformers/content-item-response.transformer.js';

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
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Content item created successfully',
    type: ApiResponseDto,
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]:
      'Invalid request body, UUID format or missing field of the content type',
    [HttpStatus.FORBIDDEN]: 'Forbidden - not course owner or admin',
    [HttpStatus.NOT_FOUND]: 'Lesson not found',
  })
  async create(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: CreateContentItemDto,
  ): Promise<void> {
    // The content is read back with GET, so nothing is returned here.
    await this.contentsService.create(lessonId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all content items for a lesson' })
  @ApiSuccessResponse(ContentItemResponseDto, HttpStatus.OK, { isArray: true })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.NOT_FOUND]: 'Lesson not found or unpublished',
  })
  async findByLesson(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Req() request: AuthenticatedRequest,
    @Query() paginationQuery?: PaginationQueryDto,
  ): Promise<ContentItemResponseDto[]> {
    const contentItems = await this.contentsService.findByLesson(
      lessonId,
      request.user,
      paginationQuery,
    );

    return contentItems.map(toContentItemResponseDto);
  }
}
