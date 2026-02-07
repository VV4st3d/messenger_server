import { MigrationInterface, QueryRunner } from "typeorm";

export class FixFriendRequestColumns1768664023153 implements MigrationInterface {
    name = 'FixFriendRequestColumns1768664023153'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP COLUMN "fromUserId"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP COLUMN "toUserId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD "toUserId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD "fromUserId" character varying NOT NULL`);
    }

}
