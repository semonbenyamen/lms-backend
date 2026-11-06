import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Course } from '../courses/entities/course.entity.js';
import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const category = { id: 'category-1', name: 'Backend Development' };

  const databaseError = (code: string) =>
    new QueryFailedError('query', [], Object.assign(new Error(), { code }));

  const queryBuilder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    getExists: vi.fn(),
    getManyAndCount: vi.fn(),
  };

  const mockCategoriesRepo = {
    findOneBy: vi.fn(),
    create: vi.fn((data: Partial<Category>) => data),
    merge: vi.fn((target: Category, data: Partial<Category>) => ({
      ...target,
      ...data,
    })),
    save: vi.fn(),
    remove: vi.fn(),
    existsBy: vi.fn(),
    createQueryBuilder: vi.fn(() => queryBuilder),
  };

  const mockCoursesRepo = {
    exists: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    queryBuilder.getExists.mockResolvedValue(false);
    mockCategoriesRepo.findOneBy.mockResolvedValue(category);
    mockCategoriesRepo.save.mockImplementation((data: Partial<Category>) =>
      Promise.resolve({ id: 'category-1', ...data }),
    );
    mockCategoriesRepo.remove.mockResolvedValue(undefined);
    mockCoursesRepo.exists.mockResolvedValue(false);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepo,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCoursesRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    beforeEach(() => {
      queryBuilder.getManyAndCount.mockResolvedValue([[category], 21]);
    });

    it('should return a page of categories by name with the meta', async () => {
      const result = await service.findAll({ page: 2, limit: 10 });

      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'category.name',
        'ASC',
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.where).not.toHaveBeenCalled();
      expect(result).toEqual({
        items: [category],
        meta: {
          total: 21,
          page: 2,
          limit: 10,
          totalPages: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      });
    });

    it('should search by part of the name', async () => {
      await service.findAll({ search: 'back' });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'category.name ILIKE :search',
        { search: '%back%' },
      );
    });

    it('should treat special search characters as normal text', async () => {
      await service.findAll({ search: '100%_a\\b' });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'category.name ILIKE :search',
        { search: '%100\\%\\_a\\\\b%' },
      );
    });
  });

  it('should find a category by id', async () => {
    await expect(service.findById('category-1')).resolves.toEqual(category);
  });

  it('should throw NotFoundException when finding an unknown category', async () => {
    mockCategoriesRepo.findOneBy.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('create', () => {
    it('should create a new category', async () => {
      const result = await service.create({ name: 'Backend Development' });

      expect(result).toEqual(category);
    });

    it('should return conflict when two requests add the same name', async () => {
      mockCategoriesRepo.save.mockRejectedValue(databaseError('23505'));

      await expect(
        service.create({ name: 'Backend Development' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not hide other database errors', async () => {
      const error = databaseError('08006');
      mockCategoriesRepo.save.mockRejectedValue(error);

      await expect(
        service.create({ name: 'Backend Development' }),
      ).rejects.toBe(error);
    });
  });

  describe('isNameAvailable', () => {
    it('should compare names regardless of letter case', async () => {
      await expect(service.isNameAvailable('backend')).resolves.toBe(true);

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'LOWER(BTRIM(category.name)) = LOWER(BTRIM(:name))',
        { name: 'backend' },
      );
    });

    it('should report a name that is already used', async () => {
      queryBuilder.getExists.mockResolvedValue(true);

      await expect(service.isNameAvailable('backend')).resolves.toBe(false);
    });
  });

  describe('update', () => {
    it('should keep the name when it is not sent', async () => {
      await service.update('category-1', {});

      expect(mockCategoriesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: category.name }),
      );
      expect(queryBuilder.getExists).not.toHaveBeenCalled();
    });

    it('should rename a category', async () => {
      await service.update('category-1', { name: 'Frontend' });

      expect(mockCategoriesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Frontend' }),
      );
    });

    it('should ignore the same category when checking the name', async () => {
      await service.update('category-1', { name: 'backend development' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'category.id != :excludedId',
        { excludedId: 'category-1' },
      );
    });

    it('should reject a name used by another category', async () => {
      queryBuilder.getExists.mockResolvedValue(true);

      await expect(
        service.update('category-1', { name: 'Frontend' }),
      ).rejects.toThrow(ConflictException);
      expect(mockCategoriesRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for an unknown category', async () => {
      mockCategoriesRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Frontend' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a category without courses', async () => {
      await service.remove('category-1');

      expect(mockCategoriesRepo.remove).toHaveBeenCalledWith(category);
    });

    it('should count soft deleted courses', async () => {
      await service.remove('category-1');

      expect(mockCoursesRepo.exists).toHaveBeenCalledWith({
        where: { categoryId: 'category-1' },
        withDeleted: true,
      });
    });

    it('should reject deleting a category with courses', async () => {
      mockCoursesRepo.exists.mockResolvedValue(true);

      await expect(service.remove('category-1')).rejects.toThrow(
        ConflictException,
      );
      expect(mockCategoriesRepo.remove).not.toHaveBeenCalled();
    });

    it('should return conflict when a course is added during the delete', async () => {
      mockCategoriesRepo.remove.mockRejectedValue(databaseError('23503'));

      await expect(service.remove('category-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException for an unknown category', async () => {
      mockCategoriesRepo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('should throw NotFoundException for an unknown category id', async () => {
    mockCategoriesRepo.existsBy.mockResolvedValue(false);

    await expect(service.assertExists('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
