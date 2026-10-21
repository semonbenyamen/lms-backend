import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { User } from '../../users/entities/user.entity.js';
import { Section } from '../../sections/entities/section.entity.js';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 100 })
  category: string;

  @Column('text', { array: true, default: '{}' })
  topics: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  difficulty: string | null;

  @Column({ type: 'varchar', length: 50, default: 'en' })
  language: string;

  @Column('text', { array: true, nullable: true })
  prerequisites: string[] | null;

  @Column({ name: 'estimated_duration', type: 'int', nullable: true })
  estimatedDuration: number | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  @Index('IDX_courses_instructor_id')
  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => User, (user) => user.courses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: Relation<User>;

  @OneToMany(() => Section, (section) => section.course)
  sections: Relation<Section>[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
