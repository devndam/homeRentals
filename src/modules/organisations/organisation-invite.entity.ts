import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { OrgPermission } from '../../types';
import { Organisation } from './organisation.entity';

@Entity('organisation_invites')
export class OrganisationInvite {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  organisationId!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ type: 'jsonb', default: [] })
  permissions!: OrgPermission[];

  @Column({ default: 'pending' })
  status!: 'pending' | 'accepted' | 'declined';

  @Column({ type: 'uuid', nullable: true })
  invitedById!: string;

  @ManyToOne(() => Organisation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @CreateDateColumn()
  createdAt!: Date;
}
