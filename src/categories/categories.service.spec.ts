import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoriesService } from './categories.service.js';
import { Category } from './entities/category.entity.js';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const queryBuilder = {
    where: vi.fn().mockReturnThis(),
    getExists: vi.fn(),
  };

  const mockCategoriesRepo = {
    find: vi.fn(),
    create: vi.fn((data: Partial<Category>) => data),
    save: vi.fn((data: Partial<Category>) =>
      Promise.resolve({ id: 'category-1', ...data }),
    ),
    existsBy: vi.fn(),
    createQueryBuilder: vi.fn(() => queryBuilder),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepo,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should list categories by name', async () => {
    await service.findAll();

    expect(mockCategoriesRepo.find).toHaveBeenCalledWith({
      order: { name: 'ASC' },
    });
  });

  it('should create a new category', async () => {
    queryBuilder.getExists.mockResolvedValue(false);

    const result = await service.create({ name: 'Backend Development' });

    expect(result).toEqual({ id: 'category-1', name: 'Backend Development' });
  });

  it('should reject a name that exists in another letter case', async () => {
    queryBuilder.getExists.mockResolvedValue(true);

    await expect(
      service.create({ name: 'backend development' }),
    ).rejects.toThrow(ConflictException);
    expect(queryBuilder.where).toHaveBeenCalledWith(
      'LOWER(category.name) = LOWER(:name)',
      { name: 'backend development' },
    );
    expect(mockCategoriesRepo.save).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException for an unknown category id', async () => {
    mockCategoriesRepo.existsBy.mockResolvedValue(false);

    await expect(service.assertExists('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
