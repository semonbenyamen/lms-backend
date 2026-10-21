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
import type { Relation } from 'typeorm';

import { Section } from '../../sections/entities/section.entity.js';

@Entity('lessons')
@Unique('UQ_lessons_section_order', ['sectionId', 'orderIndex'])
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

  @Column({ type: 'varchar', length: 50, nullable: true })
  difficulty: string | null;

  @Column('text', { array: true, nullable: true })
  prerequisites: string[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
