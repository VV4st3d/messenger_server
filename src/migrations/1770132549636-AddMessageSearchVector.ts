import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageSearchVector1770132549636 implements MigrationInterface {
  name = 'AddMessageSearchVector1770132549636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "searchVector" tsvector`,
    );

    await queryRunner.query(
      `CREATE INDEX "messages_search_idx" ON "messages" USING GIN("searchVector")`,
    );

    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_message_search_vector() RETURNS TRIGGER AS $$
            BEGIN
                NEW."searchVector" = to_tsvector('russian', COALESCE(NEW.content, ''));
                RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        `);

    await queryRunner.query(`
            CREATE TRIGGER "messages_search_trigger"
            BEFORE INSERT OR UPDATE OF "content" ON "messages"
            FOR EACH ROW EXECUTE FUNCTION update_message_search_vector();
        `);

    await queryRunner.query(
      `UPDATE "messages" SET "searchVector" = to_tsvector('russian', COALESCE(content, ''))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "messages_search_trigger" ON "messages"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_message_search_vector`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "messages_search_idx"`);
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "searchVector"`,
    );
  }
}
