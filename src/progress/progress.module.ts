
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { ContentsModule } from '../contents/contents.module.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';

import { CourseProgressController } from './course-progress.controller.js';
import { CourseProgressService } from './course-progress.service.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { ContentProgressHistory } from './entities/content-progress-history.entity.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentProgress,
      ContentProgressHistory,
      Enrollment,
      ContentItem,
      Course,
    ]),
    AuthModule,
    ContentsModule,
    EnrollmentsModule,
  ],
  controllers: [ProgressController, CourseProgressController],
  providers: [ProgressService, CourseProgressService],
  exports: [ProgressService, CourseProgressService],
})
export class ProgressModule {}
