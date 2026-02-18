import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFileSupport1771340300743 implements MigrationInterface {
    name = 'AddFileSupport1771340300743'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."messages_search_idx"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "chatId"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "filePath" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "fileType" character varying`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "fileSize" integer`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "searchVector" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "isPinned" SET NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "isPinned" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "searchVector" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "fileSize"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "fileType"`);
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "filePath"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "chatId" character varying`);
        await queryRunner.query(`CREATE INDEX "messages_search_idx" ON "messages" ("searchVector") `);
    }

}
