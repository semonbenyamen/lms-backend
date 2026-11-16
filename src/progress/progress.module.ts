import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { ContentsModule } from '../contents/contents.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { CourseProgressController } from './course-progress.controller.js';
import { CourseProgressService } from './course-progress.service.js';
import { ContentProgressHistory } from './entities/content-progress-history.entity.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { MyEnrollmentsController } from './my-enrollments.controller.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentProgress, ContentProgressHistory]),
    AuthModule,
    ContentsModule,
    CoursesModule,
    EnrollmentsModule,
  ],
  controllers: [
    ProgressController,
    CourseProgressController,
    MyEnrollmentsController,
  ],
  providers: [ProgressService, CourseProgressService],
})
export class ProgressModule {}
