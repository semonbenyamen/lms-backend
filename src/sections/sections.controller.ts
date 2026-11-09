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
import { ApiResponseDto } from '../common/dto/api-response.dto.js';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { SectionsService } from './sections.service.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';

@ApiTags('Sections')
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get section details by ID' })
  @ApiSuccessResponse(SectionResponseDto, HttpStatus.OK)
  // Use shared error responses, including 401 Unauthorized.
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.NOT_FOUND]: 'Section not found or unpublished',
  })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SectionResponseDto> {
    return this.sectionsService.findById(id, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, SectionOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a course section (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Section updated successfully',
    type: ApiResponseDto,
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or UUID format',
    [HttpStatus.FORBIDDEN]: 'Forbidden - not course owner or admin',
    [HttpStatus.NOT_FOUND]: 'Section not found',
    [HttpStatus.CONFLICT]: 'orderIndex is already used in this course',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<void> {
    // Update the section without returning its data.
    await this.sectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard, SectionOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a course section (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Section deleted successfully',
  })
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format',
    [HttpStatus.FORBIDDEN]: 'Forbidden - not course owner or admin',
    [HttpStatus.NOT_FOUND]: 'Section not found',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    // Ownership is verified by SectionOwnershipGuard.
    return this.sectionsService.remove(id);
  }
}
