import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CourseCatalogController } from './course-catalog.controller.js';
import { CoursesService } from './courses.service.js';

describe('CourseCatalogController', () => {
  let controller: CourseCatalogController;

  const coursesService = {
    findPublished: vi.fn(),
    getPublishedCourse: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    controller = new CourseCatalogController(
      coursesService as unknown as CoursesService,
    );
  });

  it('should list the published courses', async () => {
    const pagination = { page: 1, limit: 10 };
    const page = { items: [{ id: 'course-1' }], meta: { total: 1 } };
    coursesService.findPublished.mockResolvedValue(page);

    await expect(controller.findAll(pagination)).resolves.toBe(page);
    expect(coursesService.findPublished).toHaveBeenCalledWith(pagination);
  });

  it('should get a published course with its sections', async () => {
    const course = { id: 'course-1', sections: [] };
    coursesService.getPublishedCourse.mockResolvedValue(course);

    await expect(controller.findOne('course-1')).resolves.toBe(course);
    expect(coursesService.getPublishedCourse).toHaveBeenCalledWith('course-1');
  });
});
