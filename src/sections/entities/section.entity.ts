import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Course } from '../../courses/entities/course.entity.js';
import { Lesson } from '../../lessons/entities/lesson.entity.js';

@Entity('sections')
// Unique among non-deleted sections, so a deleted section frees its order.
@Index('UQ_sections_course_order', ['courseId', 'orderIndex'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_sections_course_id')
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, (course) => course.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Relation<Course>;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @OneToMany(() => Lesson, (lesson) => lesson.section)
  lessons: Relation<Lesson>[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}

export { Section as CourseSection };
