import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { RentStatus } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Invoice } from '../invoices/invoice.entity';
import { LegalDocument } from '../legal-documents/legal-document.entity';

@Entity('rents')
export class Rent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'enum', enum: RentStatus, default: RentStatus.ACTIVE })
  status!: RentStatus;

  // ─── Rental Terms ────────────────────────────
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  rentAmount!: number;

  @Column({ default: 'yearly' })
  rentPeriod!: string;

  @Column({ type: 'int', default: 1 })
  units!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cautionDeposit!: number;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  nextDueDate!: string;

  @Column({ type: 'text', nullable: true })
  additionalTerms?: string;

  // ─── Agreement ───────────────────────────────
  @Column({ nullable: true })
  agreementPdfUrl?: string;

  @Column({ nullable: true })
  tenantSignature?: string;

  @Column({ type: 'timestamp', nullable: true })
  tenantSignedAt?: Date;

  // ─── Booking Lineage ─────────────────────────
  @Column({ type: 'uuid', nullable: true })
  bookingId?: string;

  // ─── Relations ───────────────────────────────
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @OneToMany(() => Invoice, (inv) => inv.rent)
  invoices!: Invoice[];

  @OneToMany(() => LegalDocument, (ld) => ld.rent)
  legalDocuments!: LegalDocument[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
