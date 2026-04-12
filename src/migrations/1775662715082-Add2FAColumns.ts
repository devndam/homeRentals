import { MigrationInterface, QueryRunner } from "typeorm";

export class Add2FAColumns1775662715082 implements MigrationInterface {
    name = 'Add2FAColumns1775662715082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 2FA columns are already included in the InitialSchema migration.
        // This migration is kept as a no-op to maintain migration history consistency.
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
