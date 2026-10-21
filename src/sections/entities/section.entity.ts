import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Course } from '../../courses/entities/course.entity.js';
import { Lesson } from '../../lessons/entities/lesson.entity.js';

@Entity('sections')
@Unique('UQ_sections_course_order', ['courseId', 'orderIndex'])
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export { Section as CourseSection };
