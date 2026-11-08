import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategorySoftDelete1793577600000 implements MigrationInterface {
  name = 'AddCategorySoftDelete1793577600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD "deleted_at" TIMESTAMPTZ
    `);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_categories_name_normalized"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_name_normalized"
      ON "categories" (LOWER(BTRIM("name")))
      WHERE "deleted_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_categories_name_normalized"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_name_normalized"
      ON "categories" (LOWER(BTRIM("name")))
    `);
    await queryRunner.query(`
      ALTER TABLE "categories"
      DROP COLUMN "deleted_at"
    `);
  }
}
