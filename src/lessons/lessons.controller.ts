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
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { ApiResponseDto } from '../common/dto/api-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { LessonResponseDto } from './dto/lesson-response.dto.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
import { LessonOwnershipGuard } from './guards/lesson-ownership.guard.js';
import { LessonsService } from './lessons.service.js';
import { toLessonResponseDto } from './transformers/lesson-response.transformer.js';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lesson details by ID' })
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
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const { sub, role } = request.user;
    const lesson = await this.lessonsService.findById(id, { sub, role });

    return toLessonResponseDto(lesson);
  }

  @Patch(':id')
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, LessonOwnershipGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a lesson (Owner or Admin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lesson updated successfully',
    type: ApiResponseDto,
  })
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
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'orderIndex is already used in this section',
  })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateLessonDto,
  ): Promise<void> {
    // Update the lesson without returning its data.
    await this.lessonsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Authenticate the user, check their role, then verify course ownership.
  @UseGuards(JwtAuthGuard, RolesGuard, LessonOwnershipGuard)
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
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.lessonsService.remove(id);
  }
}
