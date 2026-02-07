import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackChatIdColumn1770140199614 implements MigrationInterface {
  name = 'AddBackChatIdColumn1770140199614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "chatId" character varying`,
    );

    await queryRunner.query(
      `UPDATE "messages" SET "chatId" = "chat_id"::text WHERE "chat_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "chatId"`);
  }
}
