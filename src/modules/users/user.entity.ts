import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { UserRole, AdminPermission } from '../../types';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';
import { Payment } from '../payments/payment.entity';

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

  @Column({ type: 'enum', enum: UserRole, default: UserRole.TENANT })
  role!: UserRole;

  @Column({ nullable: true })
  avatarUrl?: string;

  // ─── Landlord-specific ────────────────────
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

  // ─── Admin permissions ──────────────────────
  @Column({ default: false })
  isSuperAdmin!: boolean;

  @Column({ type: 'jsonb', default: [] })
  permissions!: AdminPermission[];

  @Column({ nullable: true })
  addedByAdminId?: string;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // ─── Relations ────────────────────────────
  @OneToMany(() => Property, (p) => p.landlord)
  properties!: Property[];

  @OneToMany(() => Booking, (b) => b.tenant)
  bookings!: Booking[];

  @OneToMany(() => Agreement, (a) => a.tenant)
  tenantAgreements!: Agreement[];

  @OneToMany(() => Agreement, (a) => a.landlord)
  landlordAgreements!: Agreement[];

  @OneToMany(() => Payment, (p) => p.user)
  payments!: Payment[];
}
