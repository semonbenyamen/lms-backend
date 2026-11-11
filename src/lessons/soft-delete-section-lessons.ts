import { EntityManager, In, IsNull } from 'typeorm';

import { ContentItem } from '../contents/entities/content-item.entity.js';
import { Lesson } from './entities/lesson.entity.js';

// Soft deletes the lessons of these sections with their content items. It runs
// on the caller's transaction, so the course or section goes with them.
export async function softDeleteSectionLessons(
  manager: EntityManager,
  sectionIds: string[],
): Promise<void> {
  if (sectionIds.length === 0) {
    return;
  }

  const lessons = await manager.find(Lesson, {
    where: { sectionId: In(sectionIds) },
    select: { id: true },
  });

  if (lessons.length > 0) {
    await manager.softDelete(ContentItem, {
      lessonId: In(lessons.map((lesson) => lesson.id)),
      deletedAt: IsNull(),
    });
  }

  await manager.softDelete(Lesson, {
    sectionId: In(sectionIds),
    deletedAt: IsNull(),
  });
}
