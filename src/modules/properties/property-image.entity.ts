import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { Property } from './property.entity';

@Entity('property_images')
export class PropertyImage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  url!: string;

  @Column({ nullable: true })
  thumbnailUrl?: string;

  @Column({ default: false })
  isPrimary!: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ default: 'image' })
  mediaType!: string; // image | video

  @Column({ type: 'uuid' })
  propertyId!: string;

  @ManyToOne(() => Property, (p) => p.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @CreateDateColumn()
  createdAt!: Date;
}
