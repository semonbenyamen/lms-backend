import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { EntityManager, IsNull, Repository } from 'typeorm';

import { JwtPayload } from '../auth/types/authenticated-request.type.js';
import { CategoriesService } from '../categories/categories.service.js';
import { assertValidAsset } from '../common/cloudinary/assert-valid-asset.js';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service.js';
import { UploadSignatureResponseDto } from '../common/cloudinary/dto/upload-signature-response.dto.js';
import { CloudinaryResourceType } from '../common/enums/cloudinary-resource-type.enum.js';
import { ContentItem } from '../contents/entities/content-item.entity.js';
import { UserRole } from '../common/enums/user-role.enum.js';
import { IdResponseDto } from '../common/dto/id-response.dto.js';
import { PaginationQueryDto } from '../common/pagintion/dto/pagination-query.dto.js';
import {
  getPaginationMeta,
  getPaginationParams,
  PaginatedResult,
} from '../common/pagintion/pagination.util.js';
import { CourseResponseDto } from './dto/course-response.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCoursePublicationDto } from './dto/update-course-publication.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { softDeleteSectionLessons } from '../lessons/soft-delete-section-lessons.js';
import { Section } from '../sections/entities/section.entity.js';
import { toSectionResponseDto } from '../sections/transformers/section-response.transformer.js';
import { Course } from './entities/course.entity.js';
import { toCourseResponseDto } from './transformers/course-response.transformer.js';

// Every thumbnail uploaded for a course starts with this prefix.
export const courseThumbnailPrefix = (courseId: string): string =>
  `lms/courses/${courseId}/thumbnail/`;

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly categoriesService: CategoriesService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  async create(
    createCourseDto: CreateCourseDto,
    instructorId: string,
  ): Promise<IdResponseDto> {
    await this.categoriesService.assertExists(createCourseDto.categoryId);

    // Fields left out take the entity defaults; new courses start as drafts.
    const course = this.coursesRepository.create({
      ...createCourseDto,
      instructorId,
    });

    const { id } = await this.coursesRepository.save(course);

    // The frontend opens the new course page with this id.
    return { id };
  }

  async findAll(
    paginationQuery: PaginationQueryDto,
    user: Pick<JwtPayload, 'sub' | 'role'>,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    const { page, limit, skip, take } = getPaginationParams(paginationQuery);

    const queryBuilder = this.courseWithCategoryQuery()
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    // Administrators see all courses, instructors only their own.
    if (user.role !== UserRole.ADMIN) {
      queryBuilder.andWhere('course.instructorId = :instructorId', {
        instructorId: user.sub,
      });
    }

    // TypeORM excludes soft-deleted courses from normal queries.
    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items: items.map(toCourseResponseDto),
      meta: getPaginationMeta(total, page, limit),
    };
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async getCourse(id: string): Promise<CourseResponseDto> {
    return toCourseResponseDto(await this.findById(id));
  }

  // Returns the entity, because other services need fields the response hides.
  async findById(id: string): Promise<Course> {
    const course = await this.courseWithCategoryQuery()
      .where('course.id = :id', { id })
      .getOne();

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  // The public catalog: anyone can list the published courses.
  async findPublished(
    paginationQuery: PaginationQueryDto,
  ): Promise<PaginatedResult<CourseResponseDto>> {
    const { page, limit, skip, take } = getPaginationParams(paginationQuery);

    const [items, total] = await this.courseWithCategoryQuery()
      .where('course.isPublished = :isPublished', { isPublished: true })
      .orderBy('course.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return {
      items: items.map(toCourseResponseDto),
      meta: getPaginationMeta(total, page, limit),
    };
  }

  // A published course with its sections, so a visitor sees the outline
  // before enrolling. Lessons and content stay behind their own endpoints.
  async getPublishedCourse(id: string): Promise<CourseResponseDto> {
    const course = await this.courseWithCategoryQuery()
      .leftJoinAndSelect('course.sections', 'section')
      .where('course.id = :id', { id })
      .andWhere('course.isPublished = :isPublished', { isPublished: true })
      .orderBy('section.orderIndex', 'ASC')
      .getOne();

    // A draft answers 404 like a missing course, so its id stays hidden.
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return {
      ...toCourseResponseDto(course),
      sections: course.sections.map(toSectionResponseDto),
    };
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async setPublication(
    id: string,
    updatePublicationDto: UpdateCoursePublicationDto,
  ): Promise<void> {
    const { isPublished, confirmUnpublishWithEnrollments } =
      updatePublicationDto;

    await this.coursesRepository.manager.transaction(async (manager) => {
      // Locked, so no student can enroll while the publication changes.
      const course = await manager.findOne(Course, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }

      if (course.isPublished === isPublished) {
        return;
      }

      if (isPublished) {
        await this.assertHasContent(id, manager);
      } else if (
        !confirmUnpublishWithEnrollments &&
        (await this.enrollmentsService.hasActiveEnrollments(id, manager))
      ) {
        // Enrolled students lose access to the content, so the instructor
        // must confirm it first.
        throw new ConflictException(
          'The course has enrolled students who will lose access to its content, send confirmUnpublishWithEnrollments to unpublish it anyway',
        );
      }

      course.isPublished = isPublished;

      await manager.save(course);
    });
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  // The course id in the public id ties the uploaded image to this course.
  createThumbnailSignature(id: string): UploadSignatureResponseDto {
    return this.cloudinaryService.createUploadSignature(
      `${courseThumbnailPrefix(id)}${randomUUID()}`,
      CloudinaryResourceType.IMAGE,
    );
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async update(id: string, updateCourseDto: UpdateCourseDto): Promise<void> {
    const course = await this.findCourseEntity(id);
    const oldThumbnailPublicId = course.thumbnailPublicId;
    const { thumbnailPublicId, ...changes } = updateCourseDto;

    if (changes.categoryId) {
      await this.categoriesService.assertExists(changes.categoryId);
    }

    // Apply only the fields provided in the update request.
    this.coursesRepository.merge(course, changes);

    if (thumbnailPublicId !== undefined) {
      await this.applyThumbnail(course, thumbnailPublicId);
    }

    await this.coursesRepository.save(course);

    if (
      oldThumbnailPublicId &&
      oldThumbnailPublicId !== course.thumbnailPublicId
    ) {
      await this.deleteReplacedThumbnail(oldThumbnailPublicId);
    }
  }

  // Returns the entity of a published course, a draft looks missing.
  async findPublishedById(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id, isPublished: true },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  // A shared lock: a running delete makes the enrollment wait, while
  // students enrolling in the same course do not wait for each other.
  async findPublishedCourseForEnrollment(
    id: string,
    manager: EntityManager,
  ): Promise<Course> {
    const course = await manager.findOne(Course, {
      where: { id, isPublished: true },
      lock: { mode: 'pessimistic_read' },
    });

    if (!course) {
      throw new NotFoundException('Course not found or unpublished');
    }

    return course;
  }

  // Ownership is verified by CourseOwnershipGuard before this runs.
  async remove(id: string): Promise<void> {
    // Soft delete the course with its sections, lessons and content together,
    // so a child is never left without a parent and its checks only need itself.
    await this.coursesRepository.manager.transaction(async (manager) => {
      // Locked, so no student can enroll while the course is being deleted.
      const course = await manager.findOne(Course, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!course) {
        throw new NotFoundException(`Course with ID ${id} not found`);
      }

      if (await this.enrollmentsService.hasActiveEnrollments(id, manager)) {
        throw new ConflictException(
          'Cannot delete a course with active enrollments',
        );
      }

      const sections = await manager.find(Section, {
        where: { courseId: id },
        select: { id: true },
      });

      await softDeleteSectionLessons(
        manager,
        sections.map((section) => section.id),
      );
      await manager.softDelete(Section, { courseId: id, deletedAt: IsNull() });
      await manager.softRemove(Course, course);
    });
  }

  // --- Helper Methods ---

  // A course is published only with at least one section, lesson and content.
  private async assertHasContent(
    id: string,
    manager: EntityManager,
  ): Promise<void> {
    // Joins skip soft-deleted lessons and sections, so only live content counts.
    const hasContent = await manager
      .createQueryBuilder(ContentItem, 'content')
      .innerJoin('content.lesson', 'lesson')
      .innerJoin('lesson.section', 'section')
      .where('section.courseId = :id', { id })
      .getExists();

    if (!hasContent) {
      throw new UnprocessableEntityException(
        'Cannot publish a course without at least one section, lesson and content',
      );
    }
  }

  // null removes the thumbnail; a public id is checked before it is used.
  private async applyThumbnail(
    course: Course,
    thumbnailPublicId: string | null,
  ): Promise<void> {
    if (thumbnailPublicId === null) {
      course.thumbnailUrl = null;
      course.thumbnailPublicId = null;
      return;
    }

    // The prefix proves the image was signed for this course.
    if (!thumbnailPublicId.startsWith(courseThumbnailPrefix(course.id))) {
      throw new BadRequestException(
        'The uploaded image does not belong to this course',
      );
    }

    const asset = await this.cloudinaryService.getAssetDetails(
      thumbnailPublicId,
      CloudinaryResourceType.IMAGE,
    );

    assertValidAsset(asset, CloudinaryResourceType.IMAGE);

    course.thumbnailUrl = asset.secureUrl;
    course.thumbnailPublicId = thumbnailPublicId;
  }

  // The new data is already saved, so a failed cleanup only leaves an
  // unused image on Cloudinary and must not fail the request.
  private async deleteReplacedThumbnail(publicId: string): Promise<void> {
    try {
      await this.cloudinaryService.deleteFile(
        publicId,
        CloudinaryResourceType.IMAGE,
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete the replaced thumbnail ${publicId} from Cloudinary`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // Categories are paginated, so a course brings the name it needs with it.
  private courseWithCategoryQuery() {
    return this.coursesRepository
      .createQueryBuilder('course')
      .leftJoin('course.category', 'category')
      .addSelect(['category.id', 'category.name']);
  }

  private async findCourseEntity(id: string): Promise<Course> {
    const course = await this.coursesRepository.findOne({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }
}
