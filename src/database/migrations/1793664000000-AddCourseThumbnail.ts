import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseThumbnail1793664000000 implements MigrationInterface {
  name = 'AddCourseThumbnail1793664000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD "thumbnail_url" TEXT,
      ADD "thumbnail_public_id" VARCHAR(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses"
      DROP COLUMN "thumbnail_public_id",
      DROP COLUMN "thumbnail_url"
    `);
  }
}
