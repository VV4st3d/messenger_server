import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBackChatIdColumn1770140199614 implements MigrationInterface {
  name = 'AddBackChatIdColumn1770140199614';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD "filePath" varchar`);
    await queryRunner.query(`ALTER TABLE "messages" ADD "fileType" varchar`);
    await queryRunner.query(`ALTER TABLE "messages" ADD "fileSize" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
