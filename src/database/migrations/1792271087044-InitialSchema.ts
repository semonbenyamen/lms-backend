import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792271087044 implements MigrationInterface {
  name = 'InitialSchema1792271087044';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create only the courses table; other modules manage their own migrations.
    await queryRunner.query(`
      CREATE TYPE "public"."courses_difficulty_enum"
      AS ENUM ('beginner', 'intermediate', 'advanced')
    `);

    await queryRunner.query(`
      CREATE TABLE "courses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255) NOT NULL,
        "description" text NOT NULL,
        "category" character varying(100) NOT NULL,
        "topics" text array NOT NULL DEFAULT '{}',
        "difficulty" "public"."courses_difficulty_enum",
        "language" character varying(50) NOT NULL DEFAULT 'en',
        "prerequisites" text array,
        "estimated_duration" integer,
        "is_published" boolean NOT NULL DEFAULT false,
        "instructor_id" uuid NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        CONSTRAINT "PK_3f70a487cc718ad8eda4e6d58c9"
          PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_courses_instructor_id"
      ON "courses" ("instructor_id")
    `);

    // Reference the users table created by the existing auth migrations.
    await queryRunner.query(`
      ALTER TABLE "courses"
      ADD CONSTRAINT "FK_4fdc83dd6b261101401ec259342"
      FOREIGN KEY ("instructor_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Roll back only the courses table created by this migration.
    await queryRunner.query(`DROP TABLE "courses"`);
    await queryRunner.query(`DROP TYPE "public"."courses_difficulty_enum"`);
  }
}
