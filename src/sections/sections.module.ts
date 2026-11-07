import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { CourseSectionsController } from './course-sections.controller.js';
import { Section } from './entities/section.entity.js';
import { SectionOwnershipGuard } from './guards/section-ownership.guard.js';
import { SectionsController } from './sections.controller.js';
import { SectionsService } from './sections.service.js';

@Module({
  imports: [
    // Register both repositories for section operations.
    TypeOrmModule.forFeature([Section, Lesson]),
    AuthModule,
    CoursesModule,
  ],
  controllers: [CourseSectionsController, SectionsController],
  providers: [SectionsService, SectionOwnershipGuard],
  exports: [SectionsService],
})
export class SectionsModule {}
