import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthTokensTable1790994901950 implements MigrationInterface {
    name = 'CreateAuthTokensTable1790994901950'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."auth_tokens_type_enum" AS ENUM('email_verification', 'password_reset')`);
        await queryRunner.query(`CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "type" "public"."auth_tokens_type_enum" NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_9691367d446cd8b18f462c191b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "auth_tokens" DROP CONSTRAINT "FK_9691367d446cd8b18f462c191b3"`);
        await queryRunner.query(`DROP TABLE "auth_tokens"`);
        await queryRunner.query(`DROP TYPE "public"."auth_tokens_type_enum"`);
    }

}
