import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/auth.module.js';
import { ContentsModule } from '../contents/contents.module.js';
import { EnrollmentsModule } from '../enrollments/enrollments.module.js';
import { CoursesModule } from '../courses/courses.module.js';
import { ProgressController } from './progress.controller.js';
import { ContentProgress } from './entities/content-progress.entity.js';
import { ProgressService } from './progress.service.js';
import { ContentProgressHistory } from './entities/content-progress-history.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ContentProgress, ContentProgressHistory]),
    AuthModule,
    ContentsModule,
    EnrollmentsModule,
    CoursesModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
