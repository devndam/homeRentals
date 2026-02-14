import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { AgreementStatus } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Entity('agreements')
export class Agreement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  landlordId!: string;

  @Column({ type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'enum', enum: AgreementStatus, default: AgreementStatus.DRAFT })
  status!: AgreementStatus;

  // ─── Terms ────────────────────────────────
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  rentAmount!: number;

  @Column({ default: 'yearly' })
  rentPeriod!: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cautionDeposit?: number;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ type: 'text', nullable: true })
  additionalTerms?: string;

  // ─── Signatures ───────────────────────────
  @Column({ nullable: true })
  tenantSignature?: string; // base64 or URL

  @Column({ type: 'timestamp', nullable: true })
  tenantSignedAt?: Date;

  @Column({ nullable: true })
  landlordSignature?: string;

  @Column({ type: 'timestamp', nullable: true })
  landlordSignedAt?: Date;

  // ─── PDF ──────────────────────────────────
  @Column({ nullable: true })
  pdfUrl?: string;

  // ─── Relations ────────────────────────────
  @ManyToOne(() => User, (u) => u.tenantAgreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => User, (u) => u.landlordAgreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'landlordId' })
  landlord!: User;

  @ManyToOne(() => Property, (p) => p.agreements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
