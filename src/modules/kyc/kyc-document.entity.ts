import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { KycDocumentType, KycStatus } from '../../types';
import { User } from '../users/user.entity';

@Entity('kyc_documents')
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'enum', enum: KycDocumentType })
  documentType!: KycDocumentType;

  @Column()
  documentUrl!: string;

  @Column({ type: 'enum', enum: KycStatus, default: KycStatus.PENDING })
  status!: KycStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'uuid', nullable: true })
  reviewedByAdminId?: string;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt?: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewedByAdminId' })
  reviewedByAdmin?: User;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
