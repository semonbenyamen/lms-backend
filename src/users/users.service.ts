import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';
import { CreateUserData } from './types/create-user-data.type.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.usersRepository.create(data);

    return this.usersRepository.save(user);
  }

  async markAsVerified(user: User): Promise<User> {
    user.isVerified = true;

    return this.usersRepository.save(user);
  }

  async findById(id: string) {
    return this.usersRepository.findOne({
      where: { id },
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