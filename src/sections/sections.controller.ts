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
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { SectionResponseDto } from './dto/section-response.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';
import {
  ApiDeleteSection,
  ApiGetSection,
  ApiUpdateSection,
} from './sections.swagger.js';
import { SectionsService } from './sections.service.js';

@ApiTags('Sections')
@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get(':id')
  @Auth()
  @ApiGetSection()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<SectionResponseDto> {
    return this.sectionsService.getSection(id, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }

  @Patch(':id')
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(SectionOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiUpdateSection()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<void> {
    return this.sectionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(SectionOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiDeleteSection()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.sectionsService.remove(id);
  }
}
