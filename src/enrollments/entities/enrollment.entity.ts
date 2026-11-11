import {
  Check,
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
import type { Relation } from 'typeorm';

import { Course } from '../../courses/entities/course.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { EnrollmentStatus } from '../../common/enums/enrollment-status.enum.js';

@Entity('enrollments')
@Unique('UQ_enrollments_student_course', ['studentId', 'courseId'])
@Index('IDX_enrollments_course_id', ['courseId'])
@Check(
  'CHK_enrollments_completion_percentage',
  '"completion_percentage" BETWEEN 0 AND 100',
)
@Check('CHK_enrollments_lessons_completed', '"lessons_completed" >= 0')
@Check(
  'CHK_enrollments_cancelled_at',
  '"cancelled_at" IS NULL OR "cancelled_at" >= "enrolled_at"',
)
// A completed enrollment has a completion date, any other status has none.
@Check(
  'CHK_enrollments_completed_at',
  `("status" = 'completed' AND "completed_at" IS NOT NULL AND "completed_at" >= "enrolled_at") OR ("status" <> 'completed' AND "completed_at" IS NULL)`,
)
export class Enrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId: string;

  // Link each enrollment to an existing user.
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  // Same FK names as the migration, so migration:generate finds no difference.
  @JoinColumn({
    name: 'student_id',
    foreignKeyConstraintName: 'FK_enrollments_student_id',
  })
  student: User;

  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'course_id',
    foreignKeyConstraintName: 'FK_enrollments_course_id',
  })
  course: Relation<Course>;

  @Column({
    type: 'enum',
    enum: EnrollmentStatus,
    default: EnrollmentStatus.NOT_STARTED,
  })
  status: EnrollmentStatus;

  @Column({
    name: 'completion_percentage',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
    // Postgres returns numeric as a string, so it is read back as a number.
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  completionPercentage: number;

  @Column({
    name: 'lessons_completed',
    type: 'int',
    default: 0,
  })
  lessonsCompleted: number;

  @Column({
    name: 'last_activity_at',
    type: 'timestamptz',
    nullable: true,
  })
  lastActivityAt: Date | null;

  @Column({
    name: 'completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  completedAt: Date | null;

  @Column({
    name: 'cancelled_at',
    type: 'timestamptz',
    nullable: true,
  })
  cancelledAt: Date | null;

  // Track when the enrollment was created or updated.
  @CreateDateColumn({
    name: 'enrolled_at',
    type: 'timestamptz',
  })
  enrolledAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
