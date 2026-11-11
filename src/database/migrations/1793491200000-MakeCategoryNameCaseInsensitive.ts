import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCategoryNameCaseInsensitive1793491200000 implements MigrationInterface {
  name = 'MakeCategoryNameCaseInsensitive1793491200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Names that differ only by letter case become one category.
    await queryRunner.query(`
      CREATE TEMP TABLE "kept_categories" ON COMMIT DROP AS
      SELECT DISTINCT ON (LOWER(BTRIM("name")))
        "id", LOWER(BTRIM("name")) AS "normalized_name"
      FROM "categories"
      ORDER BY LOWER(BTRIM("name")), "created_at", "id"
    `);
    await queryRunner.query(`
      UPDATE "courses" SET "category_id" = "kept"."id"
      FROM "categories", "kept_categories" AS "kept"
      WHERE "courses"."category_id" = "categories"."id"
        AND LOWER(BTRIM("categories"."name")) = "kept"."normalized_name"
        AND "categories"."id" <> "kept"."id"
    `);
    await queryRunner.query(`
      DELETE FROM "categories"
      WHERE "id" NOT IN (SELECT "id" FROM "kept_categories")
    `);

    await queryRunner.query(`DROP INDEX "public"."UQ_categories_name"`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_name_normalized"
      ON "categories" (LOWER(BTRIM("name")))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_categories_name_normalized"`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_name" ON "categories" ("name")
    `);
  }
}
