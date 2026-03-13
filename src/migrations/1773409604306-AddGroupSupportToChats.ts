import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroupSupportToChats1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "chats"
            ADD COLUMN IF NOT EXISTS "type" varchar(20) NOT NULL DEFAULT 'private'
        `);

    await queryRunner.query(`
            ALTER TABLE "chats"
            ADD COLUMN IF NOT EXISTS "name" varchar(100)
        `);

    await queryRunner.query(`
            ALTER TABLE "chats"
            ADD COLUMN IF NOT EXISTS "creator_id" uuid
        `);

    await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'FK_chats_creator'
                ) THEN
                    ALTER TABLE "chats"
                    ADD CONSTRAINT "FK_chats_creator"
                    FOREIGN KEY ("creator_id")
                    REFERENCES "users"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);

    await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "photos" SET DEFAULT ARRAY[]::text[]
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "chats"
            DROP CONSTRAINT IF EXISTS "FK_chats_creator"
        `);

    await queryRunner.query(
      `ALTER TABLE "chats" DROP COLUMN IF EXISTS "creator_id"`,
    );
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "name"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "type"`);

    await queryRunner.query(`
            ALTER TABLE "users"
            ALTER COLUMN "photos" SET DEFAULT '{}'
        `);
  }
}
