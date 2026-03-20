import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { LegalDocumentStatus } from '../../types';
import { Invoice } from '../invoices/invoice.entity';
import { User } from '../users/user.entity';
import { Admin } from '../admin/admin.entity';
import { LegalDocumentTemplate } from './legal-document-template.entity';

@Entity('legal_documents')
export class LegalDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  documentUrl!: string;

  @Column({ type: 'uuid', nullable: true })
  templateId?: string;

  @Column({ type: 'uuid' })
  assignedByAdminId!: string;

  @Column({
    type: 'enum',
    enum: LegalDocumentStatus,
    default: LegalDocumentStatus.PENDING,
  })
  status!: LegalDocumentStatus;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date;

  // ─── Relations ────────────────────────────
  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant!: User;

  @ManyToOne(() => LegalDocumentTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'templateId' })
  template?: LegalDocumentTemplate;

  @ManyToOne(() => Admin, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assignedByAdminId' })
  assignedByAdmin?: Admin;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
