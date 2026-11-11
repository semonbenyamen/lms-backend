import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSectionsTable1792685154666 implements MigrationInterface {
    name = 'CreateSectionsTable1792685154666'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "course_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "order_index" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f9749dd3bffd880a497d007e450" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_sections_course_id" ON "sections"  ("course_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_sections_course_order" ON "sections"  ("course_id", "order_index") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "sections" ADD CONSTRAINT "FK_53ccbd6e2fa20dac9062f4f4c36" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" DROP CONSTRAINT "FK_53ccbd6e2fa20dac9062f4f4c36"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_sections_course_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_sections_course_id"`);
        await queryRunner.query(`DROP TABLE "sections"`);
    }

}
