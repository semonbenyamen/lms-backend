import { CategoryResponseDto } from '../dto/category-response.dto.js';
import { Category } from '../entities/category.entity.js';

// Return only the fields defined in the public response DTO.
export function toCategoryResponseDto(category: Category): CategoryResponseDto {
  return {
    id: category.id,
    name: category.name,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}
