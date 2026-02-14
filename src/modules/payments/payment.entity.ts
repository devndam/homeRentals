import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { PaymentStatus, PaymentType } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Agreement } from '../agreements/agreement.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ length: 100 })
  reference!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid', nullable: true })
  propertyId?: string;

  @Column({ type: 'uuid', nullable: true })
  agreementId?: string;

  @Column({ type: 'enum', enum: PaymentType })
  type!: PaymentType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commission!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  landlordAmount!: number;

  @Column({ default: 'NGN' })
  currency!: string;

  // ─── Paystack fields ──────────────────────
  @Column({ nullable: true })
  paystackReference?: string;

  @Column({ nullable: true })
  paystackAuthorizationUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  paystackMetadata?: Record<string, any>;

  @Column({ nullable: true })
  receiptUrl?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ─── Relations ────────────────────────────
  @ManyToOne(() => User, (u) => u.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Property, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'propertyId' })
  property?: Property;

  @ManyToOne(() => Agreement, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'agreementId' })
  agreement?: Agreement;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
