import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEnrollmentsTable1792600000000
  implements MigrationInterface
{
  name = 'CreateEnrollmentsTable1792600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enrollment status type.
    await queryRunner.query(`
      CREATE TYPE "public"."enrollments_status_enum"
      AS ENUM ('active', 'cancelled')
    `);

    // Create the enrollments table.
    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "student_id" uuid NOT NULL,
        "course_id" uuid NOT NULL,
        "status" "public"."enrollments_status_enum"
          NOT NULL DEFAULT 'active',
        "enrolled_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_enrollments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_enrollments_student_course"
          UNIQUE ("student_id", "course_id")
      )
    `);

    // Add an index for course enrollment lookups.
    await queryRunner.query(`
      CREATE INDEX "IDX_enrollments_course_id"
      ON "enrollments" ("course_id")
    `);

    // Ensure every enrollment belongs to an existing user.
    await queryRunner.query(`
      ALTER TABLE "enrollments"
      ADD CONSTRAINT "FK_enrollments_student_id"
      FOREIGN KEY ("student_id")
      REFERENCES "users"("id")
      ON DELETE RESTRICT
      ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the table and its related database objects.
    await queryRunner.query(`DROP TABLE "enrollments"`);
    await queryRunner.query(
      `DROP TYPE "public"."enrollments_status_enum"`,
    );
  }
}