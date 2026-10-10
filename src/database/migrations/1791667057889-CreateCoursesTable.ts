import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoursesTable1791667057889 implements MigrationInterface {
  name = 'CreateCoursesTable1791667057889';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(255) NOT NULL, "description" text, "instructor_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3f70a487cc73b20be1ba7f5e400" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_courses_instructor_id" ON "courses" ("instructor_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "FK_courses_instructor_id" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "FK_courses_instructor_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_courses_instructor_id"`);
    await queryRunner.query(`DROP TABLE "courses"`);
  }
}
