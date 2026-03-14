import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, Index,
} from 'typeorm';
import { TransactionType, WithdrawalStatus } from '../../types';
import { Wallet } from './wallet.entity';
import { Payment } from '../payments/payment.entity';

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  walletId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Index({ unique: true })
  @Column({ length: 100 })
  reference!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  relatedPaymentId?: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balanceAfter!: number;

  @Column({ type: 'enum', enum: WithdrawalStatus, default: WithdrawalStatus.COMPLETED })
  status!: WithdrawalStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'uuid', nullable: true })
  processedByAdminId?: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  // ─── Relations ────────────────────────────
  @ManyToOne(() => Wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'walletId' })
  wallet!: Wallet;

  @ManyToOne(() => Payment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'relatedPaymentId' })
  relatedPayment?: Payment;

  @CreateDateColumn()
  createdAt!: Date;
}
