import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { DisputeType, DisputeStatus } from '../../types';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Admin } from '../admin/admin.entity';

@Entity('disputes')
export class Dispute {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  propertyId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @Column({ type: 'enum', enum: DisputeType })
  type!: DisputeType;

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.OPEN })
  status!: DisputeStatus;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ type: 'uuid', nullable: true })
  resolvedByAdminId?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  // ─── Relations ────────────────────────────
  @ManyToOne(() => Property, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: User;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolvedByAdminId' })
  resolvedByAdmin?: Admin;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
