import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { Section } from '../../sections/entities/section.entity.js';

@Entity('lessons')
// Unique among non-deleted lessons, so a deleted lesson frees its order.
@Index('UQ_lessons_section_order', ['sectionId', 'orderIndex'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_lessons_section_id')
  @Column({ name: 'section_id', type: 'uuid' })
  sectionId: string;

  @ManyToOne(() => Section, (section) => section.lessons, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: Relation<Section>;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  topic: string | null;

  @Column({ type: 'enum', enum: CourseDifficulty, nullable: true })
  difficulty: CourseDifficulty | null;

  @Column('text', { array: true, nullable: true })
  prerequisites: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
