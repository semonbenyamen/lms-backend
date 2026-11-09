import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';
import { ApiCreateSection, ApiListSections } from './sections.swagger.js';
import { SectionsService } from './sections.service.js';

// Routes that need the parent course: create and list.
@ApiTags('Sections')
@Controller('courses/:courseId/sections')
export class CourseSectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(SectionOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiCreateSection()
  create(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Body() dto: CreateSectionDto,
  ): Promise<void> {
    return this.sectionsService.create(courseId, dto);
  }

  @Get()
  @Auth()
  @ApiListSections()
  findByCourse(
    @Param('courseId', new ParseUUIDPipe()) courseId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SectionResponseDto[]> {
    return this.sectionsService.findByCourse(courseId, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }
}
