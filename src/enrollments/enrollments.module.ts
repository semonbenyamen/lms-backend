import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from './entities/enrollment.entity.js';

@Module({
  // Make the Enrollment repository available in this module.
  imports: [TypeOrmModule.forFeature([Enrollment])],
})
export class EnrollmentsModule {}