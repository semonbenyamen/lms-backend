import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { Enrollment } from '../../enrollments/entities/enrollment.entity.js';
import { ContentItem } from '../../contents/entities/content-item.entity.js';

@Entity('content_progress_history')
@Index('IDX_progress_history_enrollment_content', [
  'enrollmentId',
  'contentItemId',
])
@Check(
  'CHK_progress_history_position_nonnegative',
  '"last_position_seconds" >= 0',
)
export class ContentProgressHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'enrollment_id', type: 'uuid' })
  enrollmentId: string;

  @ManyToOne(() => Enrollment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  // Same FK names as the migration, so migration:generate finds no difference.
  @JoinColumn({
    name: 'enrollment_id',
    foreignKeyConstraintName: 'FK_progress_history_enrollment',
  })
  enrollment: Relation<Enrollment>;

  @Column({ name: 'content_item_id', type: 'uuid' })
  contentItemId: string;

  @ManyToOne(() => ContentItem, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'content_item_id',
    foreignKeyConstraintName: 'FK_progress_history_content_item',
  })
  contentItem: Relation<ContentItem>;

  @Column({
    name: 'is_completed',
    type: 'boolean',
    default: false,
  })
  isCompleted: boolean;

  @Column({
    name: 'last_position_seconds',
    type: 'int',
    nullable: true,
  })
  lastPositionSeconds: number | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;
}
