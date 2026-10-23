import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';

import { ContentItem } from './content-item.entity.js';

@Entity('content_files')
export class ContentFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content_item_id', type: 'uuid', unique: true })
  contentItemId: string;

  @OneToOne(() => ContentItem, (contentItem) => contentItem.file, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'content_item_id' })
  contentItem: Relation<ContentItem>;

  @Column({ name: 'secure_url', type: 'varchar', length: 2048 })
  secureUrl: string;

  @Column({ name: 'public_id', type: 'varchar', length: 512 })
  publicId: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 20 })
  resourceType: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}