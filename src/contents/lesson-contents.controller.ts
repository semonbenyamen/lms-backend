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
import { ContentsService } from './contents.service.js';
import { ApiCreateContent, ApiListContents } from './contents.swagger.js';
import { ContentItemResponseDto } from './dto/content-item-response.dto.js';
import { CreateContentItemDto } from './dto/create-content-item.dto.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';

// Routes that need the parent lesson: create and list.
@ApiTags('Contents')
@Controller('lessons/:lessonId/contents')
export class LessonContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Post()
  // Decorators apply bottom up, so this guard runs after the ones in Auth.
  @UseGuards(ContentOwnershipGuard)
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiCreateContent()
  create(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Body() dto: CreateContentItemDto,
  ): Promise<void> {
    return this.contentsService.create(lessonId, dto);
  }

  @Get()
  @Auth()
  @ApiListContents()
  findByLesson(
    @Param('lessonId', new ParseUUIDPipe()) lessonId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentItemResponseDto[]> {
    return this.contentsService.findByLesson(lessonId, {
      sub: request.user.sub,
      role: request.user.role,
    });
  }
}
