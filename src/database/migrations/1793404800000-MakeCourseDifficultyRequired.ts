import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCourseDifficultyRequired1793404800000 implements MigrationInterface {
  name = 'MakeCourseDifficultyRequired1793404800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Existing courses without a difficulty start at the lowest level.
    await queryRunner.query(`
      UPDATE "courses" SET "difficulty" = 'beginner' WHERE "difficulty" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "difficulty" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "courses" ALTER COLUMN "difficulty" DROP NOT NULL
    `);
  }
}
