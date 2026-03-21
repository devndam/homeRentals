import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { InvoiceStatus, InvoiceType } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { Rent } from '../rents/rent.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.REQUESTED })
  status!: InvoiceStatus;

  // ─── Terms (filled by landlord) ─────────────
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  rentAmount?: number;

  @Column({ default: 'yearly' })
  rentPeriod!: string;

  @Column({ type: 'int', default: 1 })
  units!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cautionDeposit?: number;

  @Column({ type: 'date', nullable: true })
  startDate?: string;

  @Column({ type: 'date', nullable: true })
  endDate?: string;

  @Column({ type: 'text', nullable: true })
  additionalTerms?: string;

  // ─── Tenant Signature (after payment) ───────
  @Column({ nullable: true })
  tenantSignature?: string;

  @Column({ type: 'timestamp', nullable: true })
  tenantSignedAt?: Date;

  // ─── PDF (generated after payment) ──────────
  @Column({ nullable: true })
  pdfUrl?: string;

  // ─── Payment Tracking ───────────────────────
  @Column({ type: 'boolean', default: false })
  initialPaymentDone!: boolean;

  @Column({ type: 'uuid', nullable: true })
  initialPaymentId?: string;

  @Column({ type: 'date', nullable: true })
  rentStartDate?: string;

  @Column({ type: 'date', nullable: true })
  nextRentDueDate?: string;

  // ─── Renewal Tracking ──────────────────────
  @Column({ type: 'boolean', default: false })
  isRenewal!: boolean;

  @Column({ type: 'uuid', nullable: true })
  parentInvoiceId?: string;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parentInvoiceId' })
  parentInvoice?: Invoice;

  // ─── Link to Rent ──────────────────────────
  @Column({ type: 'uuid', nullable: true })
  rentId?: string;

  @Column({ type: 'enum', enum: InvoiceType, nullable: true })
  invoiceType?: InvoiceType;

  @ManyToOne(() => Rent, (r) => r.invoices, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'rentId' })
  rent?: Rent;

  // ─── Booking Lineage ────────────────────────
  @Column({ type: 'uuid', nullable: true })
  bookingId?: string;

  // ─── Request Metadata ───────────────────────
  @Column({ type: 'timestamp', nullable: true })
  requestedAt?: Date;

  // ─── Relations ──────────────────────────────
  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking?: Booking;

  @ManyToOne(() => User, (u) => u.tenantInvoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => User, (u) => u.ownerInvoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Property, (p) => p.invoices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
