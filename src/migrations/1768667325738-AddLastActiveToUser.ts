import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastActiveToUser1768667325738 implements MigrationInterface {
    name = 'AddLastActiveToUser1768667325738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "lastActive" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastActive"`);
    }

}
