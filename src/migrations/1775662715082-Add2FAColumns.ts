import { MigrationInterface, QueryRunner } from "typeorm";

export class Add2FAColumns1775662715082 implements MigrationInterface {
    name = 'Add2FAColumns1775662715082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admins" ADD "twoFactorSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "admins" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "twoFactorSecret" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "twoFactorEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twoFactorEnabled"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "twoFactorSecret"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "twoFactorEnabled"`);
        await queryRunner.query(`ALTER TABLE "admins" DROP COLUMN "twoFactorSecret"`);
    }

}
