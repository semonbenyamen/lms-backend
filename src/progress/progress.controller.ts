import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { ContentProgressResponseDto } from './dto/content-progress-response.dto.js';
import { UpdateContentProgressDto } from './dto/update-content-progress.dto.js';
import {
  ApiGetContentProgress,
  ApiUpdateContentProgress,
} from './progress.swagger.js';
import { ProgressService } from './progress.service.js';

// Every route works on the progress of the signed in student.
@ApiTags('Content Progress')
@Controller('progress')
@Auth(UserRole.STUDENT)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('contents/:contentId')
  @ApiGetContentProgress()
  getProgress(
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentProgressResponseDto> {
    return this.progressService.getProgress(request.user.sub, contentId);
  }

  @Patch('contents/:contentId')
  @ApiUpdateContentProgress()
  updateStudentContentProgress(
    @Param('contentId', new ParseUUIDPipe()) contentId: string,
    @Body() updateProgressDto: UpdateContentProgressDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ContentProgressResponseDto> {
    return this.progressService.updateStudentContentProgress(
      request.user.sub,
      contentId,
      updateProgressDto,
    );
  }
}
