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

import { Category } from '../../categories/entities/category.entity.js';
import { CourseDifficulty } from '../../common/enums/course-difficulty.enum.js';
import { CourseLanguage } from '../../common/enums/course-language.enum.js';
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

  @Index('IDX_courses_category_id')
  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  // Same name as the migration, so migration:generate finds no difference.
  @JoinColumn({
    name: 'category_id',
    foreignKeyConstraintName: 'FK_courses_category_id',
  })
  category: Relation<Category>;

  @Column('text', { array: true, default: '{}' })
  topics: string[];

  @Column({ type: 'enum', enum: CourseDifficulty })
  difficulty: CourseDifficulty;

  @Column({
    type: 'enum',
    enum: CourseLanguage,
    default: CourseLanguage.ENGLISH,
  })
  language: CourseLanguage;

  @Column('text', { array: true, nullable: true })
  prerequisites: string[] | null;

  @Column({ name: 'estimated_duration', type: 'int', nullable: true })
  estimatedDuration: number | null;

  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

  // Filled by the Cloudinary upload, which comes in a later branch.
  @Column({ name: 'thumbnail_url', type: 'text', nullable: true })
  thumbnailUrl: string | null;

  // Needed to delete the old image from Cloudinary when it changes.
  @Column({
    name: 'thumbnail_public_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  thumbnailPublicId: string | null;

  @Index('IDX_courses_instructor_id')
  @Column({ name: 'instructor_id', type: 'uuid' })
  instructorId: string;

  @ManyToOne(() => User, (user) => user.courses, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: Relation<User>;

  @OneToMany(() => Section, (section) => section.course)
  sections: Relation<Section>[];

  // Store timestamps with timezone information for consistent date handling.
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Soft delete preserves course records and excludes them from normal queries.
  @DeleteDateColumn({
    name: 'deleted_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletedAt: Date | null;
}
