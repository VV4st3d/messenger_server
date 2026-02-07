import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSearchVectorToSimple1770133934581 implements MigrationInterface {
  name = 'UpdateSearchVectorToSimple1770133934581';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR REPLACE FUNCTION update_message_search_vector() RETURNS TRIGGER AS $$
    BEGIN
      NEW."searchVector" = to_tsvector('simple', COALESCE(NEW.content, ''));
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `);

    await queryRunner.query(
      `UPDATE "messages" SET "searchVector" = to_tsvector('simple', COALESCE(content, ''))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR REPLACE FUNCTION update_message_search_vector() RETURNS TRIGGER AS $$
    BEGIN
      NEW."searchVector" = to_tsvector('russian', COALESCE(NEW.content, ''));
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `);
  }
}
