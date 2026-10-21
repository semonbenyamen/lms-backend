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

import { ContentType } from '../../common/enums/content-type.enum.js';
import { Lesson } from '../../lessons/entities/lesson.entity.js';

@Entity('content_items')
@Unique('UQ_content_items_lesson_order', ['lessonId', 'orderIndex'])
export class ContentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_content_items_lesson_id')
  @Column({ name: 'lesson_id', type: 'uuid' })
  lessonId: string;

  @ManyToOne(() => Lesson, (lesson) => lesson.contentItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Relation<Lesson>;

  @Column({ length: 255 })
  title: string;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ContentType,
  })
  contentType: ContentType;

  @Column({ name: 'content_subtype', type: 'varchar', length: 50, nullable: true })
  contentSubtype: string | null;

  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText: string | null;

  @Column({ name: 'video_url', type: 'varchar', length: 2048, nullable: true })
  videoUrl: string | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  language: string | null;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

export { ContentItem as Content };
