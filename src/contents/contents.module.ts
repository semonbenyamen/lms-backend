import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { ContentsController } from './contents.controller.js';
import { ContentsService } from './contents.service.js';
import { ContentItem } from './entities/content-item.entity.js';
import { LessonContentsController } from './lesson-contents.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItem, Lesson]), AuthModule],
  controllers: [LessonContentsController, ContentsController],
  providers: [ContentsService],
  exports: [ContentsService],
})
export class ContentsModule {}
