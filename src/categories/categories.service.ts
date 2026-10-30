import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { Category } from './entities/category.entity.js';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    // "Backend" and "backend" would split the same courses into two filters.
    const duplicate = await this.categoriesRepository
      .createQueryBuilder('category')
      .where('LOWER(category.name) = LOWER(:name)', { name: dto.name })
      .getExists();

    if (duplicate) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    return this.categoriesRepository.save(
      this.categoriesRepository.create(dto),
    );
  }

  async assertExists(id: string): Promise<void> {
    if (!(await this.categoriesRepository.existsBy({ id }))) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }
}
