import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Unique,
} from 'typeorm';
import { OrgPermission } from '../../types';
import { Organisation } from './organisation.entity';
import { User } from '../users/user.entity';

@Entity('organisation_members')
@Unique(['organisationId', 'userId'])
export class OrganisationMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  organisationId!: string;

  @Column('uuid')
  userId!: string;

  @Column({ type: 'jsonb', default: [] })
  permissions!: OrgPermission[];

  @ManyToOne(() => Organisation, (o) => o.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organisationId' })
  organisation!: Organisation;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
