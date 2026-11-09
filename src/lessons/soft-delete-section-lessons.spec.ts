import { EntityManager, In, IsNull } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Lesson } from './entities/lesson.entity.js';
import { softDeleteSectionLessons } from './soft-delete-section-lessons.js';

describe('softDeleteSectionLessons', () => {
  const manager = {
    find: vi.fn(),
    softDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const run = (sectionIds: string[]) =>
    softDeleteSectionLessons(manager as unknown as EntityManager, sectionIds);

  it('should soft delete the content of the lessons, then the lessons', async () => {
    manager.find.mockResolvedValue([{ id: 'l-1' }, { id: 'l-2' }]);

    await run(['s-1', 's-2']);

    expect(manager.find).toHaveBeenCalledWith(Lesson, {
      where: { sectionId: In(['s-1', 's-2']) },
      select: { id: true },
    });
    expect(manager.softDelete).toHaveBeenNthCalledWith(1, ContentItem, {
      lessonId: In(['l-1', 'l-2']),
      deletedAt: IsNull(),
    });
    expect(manager.softDelete).toHaveBeenNthCalledWith(2, Lesson, {
      sectionId: In(['s-1', 's-2']),
      deletedAt: IsNull(),
    });
  });

  it('should skip the content when the sections have no lessons', async () => {
    manager.find.mockResolvedValue([]);

    await run(['s-1']);

    expect(manager.softDelete).toHaveBeenCalledTimes(1);
    expect(manager.softDelete).toHaveBeenCalledWith(Lesson, {
      sectionId: In(['s-1']),
      deletedAt: IsNull(),
    });
  });

  it('should do nothing when there are no sections', async () => {
    await run([]);

    expect(manager.find).not.toHaveBeenCalled();
    expect(manager.softDelete).not.toHaveBeenCalled();
  });
});
