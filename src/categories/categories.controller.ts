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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesQueryDto } from './dto/categories-query.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('dashboard/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Search categories, for course forms and filters' })
  @ApiSuccessResponse(CategoryResponseDto, HttpStatus.OK, {
    isPaginated: true,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search or pagination query parameters',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  findAll(@Query() query: CategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiSuccessResponse(CategoryResponseDto)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  // Instructors add one from the course form when the list doesn't have it.
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a category (Instructor or Admin)' })
  @ApiSuccessResponse(CategoryResponseDto, HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or the name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - only instructors and admins can add categories',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Another request added the same name at the same time',
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  // A category is shared between instructors, so only admins can change it.
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Rename a category (Admin only)' })
  @ApiSuccessResponse(CategoryResponseDto)
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format or request body',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - only admins can update categories',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'A category with this name already exists',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete a category without courses (Admin only)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID format',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - only admins can delete categories',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'This category has courses',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.remove(id);
  }
}
