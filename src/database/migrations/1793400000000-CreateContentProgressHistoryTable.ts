
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContentProgressHistoryTable1793400000000
  implements MigrationInterface
{
  name = 'CreateContentProgressHistoryTable1793400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "content_progress_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "enrollment_id" uuid NOT NULL,
        "content_item_id" uuid NOT NULL,
        "is_completed" boolean NOT NULL DEFAULT false,
        "last_position_seconds" integer,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content_progress_history"
          PRIMARY KEY ("id"),
        CONSTRAINT "CHK_progress_history_position_nonnegative"
          CHECK ("last_position_seconds" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_progress_history_enrollment_content"
      ON "content_progress_history" ("enrollment_id", "content_item_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "content_progress_history"
      ADD CONSTRAINT "FK_progress_history_enrollment"
      FOREIGN KEY ("enrollment_id")
      REFERENCES "enrollments"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "content_progress_history"
      ADD CONSTRAINT "FK_progress_history_content_item"
      FOREIGN KEY ("content_item_id")
      REFERENCES "content_items"("id")
      ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "content_progress_history"
    `);
  }
}
