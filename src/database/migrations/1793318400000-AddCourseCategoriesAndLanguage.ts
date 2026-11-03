import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseCategoriesAndLanguage1793318400000 implements MigrationInterface {
  name = 'AddCourseCategoriesAndLanguage1793318400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_categories_name" ON "categories" ("name")
    `);

    // Existing courses keep their category: each distinct text becomes a row.
    await queryRunner.query(`
      INSERT INTO "categories" ("name")
      SELECT DISTINCT TRIM("category") FROM "courses"
    `);
    await queryRunner.query(`ALTER TABLE "courses" ADD "category_id" uuid`);
    await queryRunner.query(`
      UPDATE "courses" SET "category_id" = "categories"."id"
      FROM "categories" WHERE "categories"."name" = TRIM("courses"."category")
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "category_id" SET NOT NULL
    `);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "category"`);
    await queryRunner.query(`
      CREATE INDEX "IDX_courses_category_id" ON "courses" ("category_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD CONSTRAINT "FK_courses_category_id"
      FOREIGN KEY ("category_id") REFERENCES "categories"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    // Anything other than the supported languages falls back to English.
    await queryRunner.query(`
      CREATE TYPE "public"."courses_language_enum" AS ENUM ('ar', 'en')
    `);
    await queryRunner.query(`
      UPDATE "courses" SET "language" = 'en' WHERE "language" NOT IN ('ar', 'en')
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language"
      TYPE "public"."courses_language_enum"
      USING "language"::"public"."courses_language_enum"
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language" SET DEFAULT 'en'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language" DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language"
      TYPE character varying(50) USING "language"::text
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "language" SET DEFAULT 'en'
    `);
    await queryRunner.query(`DROP TYPE "public"."courses_language_enum"`);

    await queryRunner.query(`
      ALTER TABLE "courses" ADD "category" character varying(100)
    `);
    await queryRunner.query(`
      UPDATE "courses" SET "category" = "categories"."name"
      FROM "categories" WHERE "categories"."id" = "courses"."category_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "category" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" DROP CONSTRAINT "FK_courses_category_id"
    `);
    await queryRunner.query(`DROP INDEX "public"."IDX_courses_category_id"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN "category_id"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
