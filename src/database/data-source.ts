import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { AuthToken } from '../auth/entities/auth-token.entity.js';
import { RefreshToken } from '../auth/entities/refresh-token.entity.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,

  entities: [User, AuthToken, RefreshToken],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});