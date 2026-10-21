import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';

@Entity('enrollments')
@Unique('UQ_enrollments_student_course', ['studentId', 'courseId'])
@Index('IDX_enrollments_course_id', ['courseId'])
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  // Link each enrollment to an existing user.
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  // Course relation will be added when the Course entity is available.
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.ACTIVE,
  })
  status: EnrollmentStatus;

  // Track when the enrollment was created or updated.
  @CreateDateColumn({ name: 'enrolled_at' })
  enrolledAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}