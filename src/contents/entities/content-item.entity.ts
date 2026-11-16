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

import { ContentType } from '../../common/enums/content-type.enum.js';
import { Course } from '../../courses/entities/course.entity.js';
import { Lesson } from '../../lessons/entities/lesson.entity.js';

@Entity('content_items')
// Unique among non-deleted items, so a deleted item frees its order.
@Index('UQ_content_items_lesson_order', ['lessonId', 'orderIndex'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
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

  // The course of the lesson, kept on the item so access checks reach the
  // course in one join. It is set on create and never changes, because a
  // lesson cannot move to another section and a section cannot move to
  // another course.
  @Index('IDX_content_items_course_id')
  @Column({ name: 'course_id', type: 'uuid' })
  courseId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'course_id',
    foreignKeyConstraintName: 'FK_content_items_course_id',
  })
  course: Relation<Course>;

  @Column({ length: 255 })
  title: string;

  @Column({
    name: 'content_type',
    type: 'enum',
    enum: ContentType,
  })
  contentType: ContentType;

  // Text content, or the transcript of a video.
  @Column({ name: 'body_text', type: 'text', nullable: true })
  bodyText: string | null;

  @Column({ name: 'video_url', type: 'varchar', length: 2048, nullable: true })
  videoUrl: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl: string | null;

  // The Cloudinary file behind videoUrl or imageUrl, null for external links.
  // Deleted items keep their file, so a file never moves to another item.
  @Index('UQ_content_items_media_public_id', { unique: true })
  @Column({
    name: 'media_public_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  mediaPublicId: string | null;

  @Column({ name: 'duration_seconds', type: 'int', nullable: true })
  durationSeconds: number | null;

  @Column({ name: 'order_index', type: 'int' })
  orderIndex: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
