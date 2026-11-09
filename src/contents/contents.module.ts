import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { LessonsModule } from '../lessons/lessons.module.js';
import { ContentsController } from './contents.controller.js';
import { ContentsService } from './contents.service.js';
import { ContentItem } from './entities/content-item.entity.js';
import { ContentOwnershipGuard } from './guards/content-ownership.guard.js';
import { LessonContentsController } from './lesson-contents.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItem]), AuthModule, LessonsModule],
  controllers: [LessonContentsController, ContentsController],
  providers: [ContentsService, ContentOwnershipGuard],
  exports: [ContentsService],
})
export class ContentsModule {}
