import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { CourseSectionsController } from './course-sections.controller.js';
import { Section } from './entities/section.entity.js';
import { SectionsController } from './sections.controller.js';
import { SectionsService } from './sections.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Section]), AuthModule, CoursesModule],
  controllers: [CourseSectionsController, SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
