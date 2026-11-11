import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContentMediaPublicId1793750400000 implements MigrationInterface {
  name = 'AddContentMediaPublicId1793750400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "content_items"
      ADD "media_public_id" VARCHAR(255)
    `);
    // Deleted items keep their file, so a file never moves to another item.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_content_items_media_public_id"
      ON "content_items" ("media_public_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_content_items_media_public_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "content_items"
      DROP COLUMN "media_public_id"
    `);
  }
}
