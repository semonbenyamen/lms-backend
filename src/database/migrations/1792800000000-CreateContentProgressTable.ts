import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContentProgressTable1792800000000 implements MigrationInterface {
  name = 'CreateContentProgressTable1792800000000';

  // Store one progress record for each enrollment and content item.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "content_progress" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "enrollment_id" uuid NOT NULL,
        "content_item_id" uuid NOT NULL,
        "is_completed" boolean NOT NULL DEFAULT false,
        "last_position_seconds" integer NOT NULL DEFAULT 0,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_content_progress" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_content_progress_enrollment_content" UNIQUE ("enrollment_id", "content_item_id"),
        CONSTRAINT "CHK_content_progress_position_nonnegative" CHECK ("last_position_seconds" >= 0),
        CONSTRAINT "FK_content_progress_enrollment" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_content_progress_content" FOREIGN KEY ("content_item_id") REFERENCES "content_items"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_content_progress_content_id" ON "content_progress" ("content_item_id")`);
  }

  // Undo the progress table if this migration is rolled back.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_content_progress_content_id"`);
    await queryRunner.query(`DROP TABLE "content_progress"`);
  }
}
