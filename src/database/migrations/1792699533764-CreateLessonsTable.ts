import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateLessonsTable1792699533764 implements MigrationInterface {
    name = 'CreateLessonsTable1792699533764'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."lessons_difficulty_enum" AS ENUM('beginner', 'intermediate', 'advanced')`);
        await queryRunner.query(`CREATE TABLE "lessons" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "order_index" integer NOT NULL, "topic" character varying(255), "difficulty" "public"."lessons_difficulty_enum", "prerequisites" text array, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9b9a8d455cac672d262d7275730" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_lessons_section_id" ON "lessons"  ("section_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_lessons_section_order" ON "lessons"  ("section_id", "order_index") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "lessons" ADD CONSTRAINT "FK_19261e484ffd22b40ea596ece4d" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "lessons" DROP CONSTRAINT "FK_19261e484ffd22b40ea596ece4d"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_lessons_section_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_lessons_section_id"`);
        await queryRunner.query(`DROP TABLE "lessons"`);
        await queryRunner.query(`DROP TYPE "public"."lessons_difficulty_enum"`);
    }

}
