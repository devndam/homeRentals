import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('blog_tags')
export class BlogTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 60 })
  name!: string;

  @Index({ unique: true })
  @Column({ length: 80 })
  slug!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
