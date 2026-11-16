import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { AuthToken } from '../auth/entities/auth-token.entity.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import { Course } from '../courses/entities/course.entity.js';
import { Section } from '../sections/entities/section.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Lesson } from '../lessons/entities/lesson.entity.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Enrollment } from '../enrollments/entities/enrollment.entity.js';
import { ContentProgress } from '../progress/entities/content-progress.entity.js';
import { ContentProgressHistory } from '../progress/entities/content-progress-history.entity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  entities: [
    User,
    AuthToken,
    RefreshToken,
    Course,
    Category,
    Section,
    Lesson,
    ContentItem,
    Enrollment,
    ContentProgress,
    ContentProgressHistory,
  ],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
