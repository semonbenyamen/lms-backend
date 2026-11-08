import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { PaginatedResult } from '../common/pagintion/pagination.util.js';
import {
  ApiCreateCategory,
  ApiDeleteCategory,
  ApiGetCategory,
  ApiListCategories,
  ApiUpdateCategory,
} from './categories.swagger.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesQueryDto } from './dto/categories-query.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories')
@Controller('dashboard/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @Auth()
  @ApiListCategories()
  findAll(
    @Query() query: CategoriesQueryDto,
  ): Promise<PaginatedResult<CategoryResponseDto>> {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @Auth()
  @ApiGetCategory()
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.getCategory(id);
  }

  @Post()
  // Instructors add one from the course form when the list doesn't have it.
  @Auth(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiCreateCategory()
  create(@Body() dto: CreateCategoryDto): Promise<IdResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  // A category is shared between instructors, so only admins can change it.
  @Auth(UserRole.ADMIN)
  @ApiUpdateCategory()
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<void> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Auth(UserRole.ADMIN)
  @ApiDeleteCategory()
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
