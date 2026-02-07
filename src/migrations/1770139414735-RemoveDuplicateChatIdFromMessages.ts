import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveDuplicateChatIdFromMessages1770139414735 implements MigrationInterface {
  name = 'RemoveDuplicateChatIdFromMessages1770139414735';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "chatId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "chatId" character varying NOT NULL`,
    );

  }
}
