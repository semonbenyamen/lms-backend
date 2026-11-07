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
import { ContentsService } from './contents.service.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { UpdateContentItemDto } from './dto/update-content-item.dto.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';
import { toContentItemResponseDto } from './transformers/content-item-response.transformer.js';

const NOT_COURSE_OWNER = 'Forbidden - not course owner or admin';

// Routes for one content item by its id: read, update and delete.
@ApiTags('Contents')
@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get content item details by ID' })
  @ApiSuccessResponse(ContentItemResponseDto, HttpStatus.OK)
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.NOT_FOUND]: 'Content item not found or unpublished',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentItemResponseDto> {
    return toContentItemResponseDto(
      await this.contentsService.findById(id, request.user),
    );
  }

  @Patch(':id')
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, ContentOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a content item (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content item updated successfully',
    type: ApiResponseDto,
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]:
      'Invalid request body, UUID format or missing field of the content type',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Content item not found',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContentItemDto,
  ): Promise<void> {
    return this.contentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, ContentOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a content item (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Content item deleted successfully',
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.FORBIDDEN]: NOT_COURSE_OWNER,
    [HttpStatus.NOT_FOUND]: 'Content item not found',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.contentsService.remove(id);
  }
}
