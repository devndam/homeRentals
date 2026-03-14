import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, Index,
} from 'typeorm';
import { AdminPermission } from '../../types';

@Entity('admins')
export class Admin {
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
  isSuperAdmin!: boolean;

  @Column({ type: 'jsonb', default: [] })
  permissions!: AdminPermission[];

  @Column({ nullable: true })
  addedByAdminId?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpires?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
