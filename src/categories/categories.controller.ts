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
import { ApiAuthErrorResponses } from '../common/decorators/api-error-responses.decorator.js';
import { ApiSuccessResponse } from '../common/decorators/api-success-response.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { CategoriesService } from './categories.service.js';
import { CategoriesQueryDto } from './dto/categories-query.dto.js';
import { CategoryResponseDto } from './dto/category-response.dto.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

const CATEGORY_NOT_FOUND = 'Category not found';
const INVALID_UUID = 'Invalid UUID format';

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
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid search or pagination query parameters',
  })
  findAll(@Query() query: CategoriesQueryDto) {
    return this.categoriesService.findAll(query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiSuccessResponse(CategoryResponseDto)
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: INVALID_UUID,
    [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
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
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid request body or the name already exists',
    [HttpStatus.FORBIDDEN]:
      'Forbidden - only instructors and admins can add categories',
    [HttpStatus.CONFLICT]:
      'Another request added the same name at the same time',
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
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: 'Invalid UUID format or request body',
    [HttpStatus.FORBIDDEN]: 'Forbidden - only admins can update categories',
    [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
    [HttpStatus.CONFLICT]: 'A category with this name already exists',
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
  @ApiAuthErrorResponses({
    [HttpStatus.BAD_REQUEST]: INVALID_UUID,
    [HttpStatus.FORBIDDEN]: 'Forbidden - only admins can delete categories',
    [HttpStatus.NOT_FOUND]: CATEGORY_NOT_FOUND,
    [HttpStatus.CONFLICT]: 'This category has courses',
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.remove(id);
  }
}
