import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Injectable()
export class AuthUserService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async markAsVerified(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      isVerified: true,
    });
  }

  async updatePassword(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      passwordHash,
    });
  }
}