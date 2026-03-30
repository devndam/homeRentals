import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ─── Storage Provider ───────────────────
  @Column({ default: 'local' })
  storageProvider!: string; // 'local' | 'cloudinary' | 'do_spaces'

  // ─── Platform Commission ─────────────────
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 5 })
  platformCommissionPercent!: number;

  // ─── Service Charge ──────────────────────
  @Column({ default: 'fixed' })
  serviceChargeType!: string; // 'percentage' | 'fixed'

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  serviceChargeValue!: number;

  // ─── Agent Fee ───────────────────────────
  @Column({ default: 'fixed' })
  agentFeeType!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  agentFeeValue!: number;

  // ─── Legal Fee ───────────────────────────
  @Column({ default: 'fixed' })
  legalFeeType!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  legalFeeValue!: number;

  // ─── Caution Deposit ─────────────────────
  @Column({ default: 'fixed' })
  cautionDepositType!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cautionDepositValue!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
