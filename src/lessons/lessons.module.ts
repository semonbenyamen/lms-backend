import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { Course } from '../courses/entities/course.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { Lesson } from './entities/lesson.entity.js';
import { LessonsController } from './lessons.controller.js';
import { LessonsService } from './lessons.service.js';
import { SectionLessonsController } from './section-lessons.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lesson, Section, Course]),
    AuthModule,
  ],
  controllers: [SectionLessonsController, LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
