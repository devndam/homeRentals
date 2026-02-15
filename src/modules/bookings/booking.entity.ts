import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'uuid', nullable: true })
  agentId?: string;

  @Column({ type: 'timestamp' })
  proposedDate!: Date;

  @Column({ type: 'timestamp', nullable: true })
  inspectionDate?: Date;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column({ type: 'text', nullable: true })
  ownerNote?: string;

  @Column({ type: 'timestamp', nullable: true })
  alternativeDate?: Date;

  @ManyToOne(() => User, (u) => u.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => Property, (p) => p.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'agentId' })
  agent?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}