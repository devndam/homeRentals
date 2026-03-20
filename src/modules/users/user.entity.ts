import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, OneToOne, Index,
} from 'typeorm';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Payment } from '../payments/payment.entity';
import { Wallet } from '../wallet/wallet.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  firstName!: string;

  @Column({ length: 100 })
  lastName!: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  email!: string;

  @Index({ unique: true })
  @Column({ length: 20 })
  phone!: string;

  @Column({ select: false })
  password!: string;

  @Column({ default: false })
  isPropertyOwner!: boolean;

  @Column({ nullable: true })
  avatarUrl?: string;

  // ─── Property Owner-specific ────────────────
  @Column({ nullable: true, length: 255 })
  bankName?: string;

  @Column({ nullable: true, length: 20 })
  bankAccountNumber?: string;

  @Column({ nullable: true, length: 255 })
  bankAccountName?: string;

  @Column({ nullable: true })
  paystackSubaccountCode?: string;

  // ─── Tenant preferences ───────────────────
  @Column({ type: 'jsonb', nullable: true })
  preferences?: {
    budgetMin?: number;
    budgetMax?: number;
    preferredLocations?: string[];
    propertyTypes?: string[];
  };

  // ─── Verification ─────────────────────────
  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ default: false })
  phoneVerified!: boolean;

  @Column({ default: false })
  identityVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @Column({ nullable: true })
  emailVerificationOTP?: string;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ─── Relations ────────────────────────────
  @OneToMany(() => Property, (p) => p.owner)
  properties!: Property[];

  @OneToMany(() => Booking, (b) => b.tenant)
  bookings!: Booking[];

  @OneToMany(() => Invoice, (a) => a.tenant)
  tenantInvoices!: Invoice[];

  @OneToMany(() => Invoice, (a) => a.owner)
  ownerInvoices!: Invoice[];

  @OneToMany(() => Payment, (p) => p.user)
  payments!: Payment[];

  @OneToOne(() => Wallet, (w) => w.user)
  wallet?: Wallet;
}