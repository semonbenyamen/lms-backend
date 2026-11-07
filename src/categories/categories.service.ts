import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import {
  getPaginationMeta,
  getPaginationParams,
  PaginatedResult,
} from '../common/pagintion/pagination.util.js';
import { Course } from '../courses/entities/course.entity.js';
import { CategoriesQueryDto } from './dto/categories-query.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { Category } from './entities/category.entity.js';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
  ) {}

  async findAll(query: CategoriesQueryDto): Promise<PaginatedResult<Category>> {
    const { page, limit, skip, take } = getPaginationParams(query);

    const queryBuilder = this.categoriesRepository
      .createQueryBuilder('category')
      .orderBy('category.name', 'ASC')
      .skip(skip)
      .take(take);

    if (query.search) {
      // Treat % and _ in the search text as normal characters.
      const search = query.search.replace(/[\\%_]/g, '\\$&');

      queryBuilder.where('category.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, meta: getPaginationMeta(total, page, limit) };
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOneBy({ id });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  // The name is checked by IsCategoryNameAvailable in the DTO before this runs.
  create(dto: CreateCategoryDto): Promise<Category> {
    return this.saveCategory(this.categoriesRepository.create(dto));
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<void> {
    const category = await this.findById(id);

    if (dto.name && !(await this.isNameAvailable(dto.name, id))) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    await this.saveCategory(this.categoriesRepository.merge(category, dto));
  }

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);

    // Soft deleted courses still reference the category, so they count too.
    const hasCourses = await this.coursesRepository.exists({
      where: { categoryId: id },
      withDeleted: true,
    });

    if (hasCourses) {
      throw new ConflictException('This category has courses');
    }

    try {
      await this.categoriesRepository.remove(category);
    } catch (error) {
      // A course may be added between the check and the delete.
      if (this.isDatabaseError(error, FOREIGN_KEY_VIOLATION)) {
        throw new ConflictException('This category has courses');
      }
      throw error;
    }
  }

  async assertExists(id: string): Promise<void> {
    if (!(await this.categoriesRepository.existsBy({ id }))) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }

  async isNameAvailable(name: string, excludedId?: string): Promise<boolean> {
    // "Backend" and "backend" would split the same courses into two filters.
    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .where('LOWER(BTRIM(category.name)) = LOWER(BTRIM(:name))', { name });

    if (excludedId) {
      query.andWhere('category.id != :excludedId', { excludedId });
    }

    return !(await query.getExists());
  }

  private async saveCategory(category: Category): Promise<Category> {
    try {
      return await this.categoriesRepository.save(category);
    } catch (error) {
      // Two requests may pass the name check at the same time.
      if (this.isDatabaseError(error, UNIQUE_VIOLATION)) {
        throw new ConflictException(
          `Category "${category.name}" already exists`,
        );
      }
      throw error;
    }
  }

  private isDatabaseError(error: unknown, code: string): boolean {
    return (
      error instanceof QueryFailedError &&
      (error.driverError as { code?: string }).code === code
    );
  }
}
