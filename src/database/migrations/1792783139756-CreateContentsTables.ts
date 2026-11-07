import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateContentsTables1792783139756 implements MigrationInterface {
    name = 'CreateContentsTables1792783139756'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."content_items_content_type_enum" AS ENUM('text', 'video', 'image')`);
        await queryRunner.query(`CREATE TABLE "content_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lesson_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "content_type" "public"."content_items_content_type_enum" NOT NULL, "body_text" text, "video_url" character varying(2048), "image_url" character varying(2048), "duration_seconds" integer, "order_index" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_9c6bf4f28851752cee186915e39" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_content_items_lesson_id" ON "content_items"  ("lesson_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_content_items_lesson_order" ON "content_items"  ("lesson_id", "order_index") WHERE "deleted_at" IS NULL`);
        await queryRunner.query(`ALTER TABLE "content_items" ADD CONSTRAINT "FK_9f7b4236528cca66f6474069b8b" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "content_items" DROP CONSTRAINT "FK_9f7b4236528cca66f6474069b8b"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_content_items_lesson_order"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_content_items_lesson_id"`);
        await queryRunner.query(`DROP TABLE "content_items"`);
        await queryRunner.query(`DROP TYPE "public"."content_items_content_type_enum"`);
    }

}
