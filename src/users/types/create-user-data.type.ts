import { User } from '../entities/user.entity.js';

export type CreateUserData = Pick<
  User,
  'firstName' | 'lastName' | 'email' | 'passwordHash'
>;