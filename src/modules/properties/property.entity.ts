import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, Index, JoinColumn,
} from 'typeorm';
import { PropertyStatus, PropertyType } from '../../types';
import { User } from '../users/user.entity';
import { PropertyImage } from './property-image.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'enum', enum: PropertyType })
  type!: PropertyType;

  @Column({ type: 'enum', enum: PropertyStatus, default: PropertyStatus.DRAFT })
  status!: PropertyStatus;

  // ─── Pricing ──────────────────────────────
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column({ default: 'yearly' })
  pricePeriod!: string; // yearly, monthly, daily

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cautionFee?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  agencyFee?: number;

  // ─── Location ─────────────────────────────
  @Index()
  @Column({ length: 255 })
  address!: string;

  @Column({ length: 100 })
  city!: string;

  @Index()
  @Column({ length: 100 })
  state!: string;

  @Column({ length: 100, default: 'Nigeria' })
  country!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude?: number;

  // ─── Details ──────────────────────────────
  @Column({ type: 'int', nullable: true })
  bedrooms?: number;

  @Column({ type: 'int', nullable: true })
  bathrooms?: number;

  @Column({ type: 'int', nullable: true })
  toilets?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  areaSqm?: number;

  @Column({ type: 'jsonb', default: [] })
  amenities!: string[];

  @Column({ type: 'jsonb', nullable: true })
  rules?: string[];

  @Column({ default: false })
  isFurnished!: boolean;

  @Column({ default: false })
  hasServicing!: boolean;

  @Column({ default: false })
  isPetFriendly!: boolean;

  // ─── Admin ────────────────────────────────
  @Column({ nullable: true })
  rejectionReason?: string;

  @Column({ default: 0 })
  viewCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  availableFrom?: Date;

  // ─── Agent Assignment ─────────────────────
  @Column({ type: 'uuid', nullable: true })
  agentId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent?: User;

  // ─── Relations ────────────────────────────
  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, (u) => u.properties, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @OneToMany(() => PropertyImage, (img) => img.property, { cascade: true })
  images!: PropertyImage[];

  @OneToMany(() => Booking, (b) => b.property)
  bookings!: Booking[];

  @OneToMany(() => Agreement, (a) => a.property)
  agreements!: Agreement[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}