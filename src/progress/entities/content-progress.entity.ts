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

import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { ContentItem } from '../../contents/entities/content-item.entity.js';

@Entity('content_progress')
// Keep only one progress record for each enrollment and content item.
@Unique('UQ_content_progress_enrollment_content', ['enrollmentId', 'contentItemId'])
@Index('IDX_content_progress_content_id', ['contentItemId'])
@Check('CHK_content_progress_position_nonnegative', '"last_position_seconds" >= 0')
export class ContentProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id', type: 'uuid' })
  enrollmentId: string;

  // Remove progress when the enrollment is removed.
  @ManyToOne(() => Enrollment, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Relation<Enrollment>;

  @Column({ name: 'content_item_id', type: 'uuid' })
  contentItemId: string;

  // Remove progress when its content item is removed.
  @ManyToOne(() => ContentItem, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_item_id' })
  contentItem: Relation<ContentItem>;

  // Track whether the student has completed this content.
@Column({ name: 'is_completed', type: 'boolean', default: false })
isCompleted: boolean;

  @Column({ name: 'last_position_seconds', type: 'int', default: 0 })
  lastPositionSeconds: number;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
