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
import { ContentsService } from './contents.service.js';
import {
  ApiDeleteContent,
  ApiGetContent,
  ApiUpdateContent,
} from './contents.swagger.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { UpdateContentItemDto } from './dto/update-content-item.dto.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';

// Routes for one content item by its id: read, update and delete.
@ApiTags('Contents')
@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get(':id')
  @Auth()
  @ApiGetContent()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentItemResponseDto> {
    return this.contentsService.getContent(id, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }

  @Patch(':id')
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(ContentOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiUpdateContent()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateContentItemDto,
  ): Promise<void> {
    return this.contentsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(ContentOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiDeleteContent()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.contentsService.remove(id);
  }
}
