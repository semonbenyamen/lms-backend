import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { AuthToken } from '../auth/entities/auth-token.entity.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';
import { Course } from '../courses/entities/course.entity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,

  entities: [User, AuthToken, RefreshToken, Course],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
