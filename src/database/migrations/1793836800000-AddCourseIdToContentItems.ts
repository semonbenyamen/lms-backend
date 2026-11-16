import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseIdToContentItems1793836800000 implements MigrationInterface {
  name = 'AddCourseIdToContentItems1793836800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_items"
      ADD "course_id" uuid
    `);
    // Existing items take the course of their lesson, deleted ones included.
    await queryRunner.query(`
      UPDATE "content_items" AS "content"
      SET "course_id" = "section"."course_id"
      FROM "lessons" AS "lesson"
      JOIN "sections" AS "section" ON "section"."id" = "lesson"."section_id"
      WHERE "lesson"."id" = "content"."lesson_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "content_items"
      ALTER COLUMN "course_id" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_content_items_course_id"
      ON "content_items" ("course_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "content_items"
      ADD CONSTRAINT "FK_content_items_course_id"
      FOREIGN KEY ("course_id")
      REFERENCES "courses"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_items"
      DROP CONSTRAINT "FK_content_items_course_id"
    `);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_content_items_course_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "content_items"
      DROP COLUMN "course_id"
    `);
  }
}
