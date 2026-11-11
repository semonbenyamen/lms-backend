import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Enrollment } from './entities/enrollment.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment])],
})
export class EnrollmentsModule {}
