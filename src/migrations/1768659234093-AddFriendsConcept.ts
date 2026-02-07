import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFriendsConcept1768659234093 implements MigrationInterface {
    name = 'AddFriendsConcept1768659234093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "friend_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fromUserId" character varying NOT NULL, "toUserId" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE, "from_user_id" uuid, "to_user_id" uuid, CONSTRAINT "UQ_d5b24043b2d9f8ac24478b064f8" UNIQUE ("from_user_id", "to_user_id"), CONSTRAINT "PK_3827ba86ce64ecb4b90c92eeea6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_5e9a1caaf3e22527e20256ef724" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_8085211f8c9a14a68cc82ff134d" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_8085211f8c9a14a68cc82ff134d"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_5e9a1caaf3e22527e20256ef724"`);
        await queryRunner.query(`DROP TABLE "friend_requests"`);
    }

}
