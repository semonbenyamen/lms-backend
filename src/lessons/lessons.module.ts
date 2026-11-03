import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { SectionsModule } from '../sections/sections.module.js';
import { Lesson } from './entities/lesson.entity.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';
import { SectionLessonsController } from './section-lessons.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson]), AuthModule, SectionsModule],
  controllers: [SectionLessonsController, LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
