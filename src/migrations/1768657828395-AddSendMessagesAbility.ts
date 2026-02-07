import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSendMessagesAbility1768657828395 implements MigrationInterface {
    name = 'AddSendMessagesAbility1768657828395'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "chatId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "senderId" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "type" character varying NOT NULL DEFAULT 'text'`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "chat_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_7540635fef1922f0b156b9ef74f"`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "chat_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "type"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "type" character varying(20) NOT NULL DEFAULT 'text'`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "FK_7540635fef1922f0b156b9ef74f" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "senderId"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "chatId"`);
    }

}
