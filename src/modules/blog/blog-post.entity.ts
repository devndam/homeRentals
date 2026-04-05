import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn, Index,
} from 'typeorm';
import { BlogPostStatus } from '../../types';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';
import { Admin } from '../admin/admin.entity';

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  title!: string;

  @Index({ unique: true })
  @Column({ length: 280 })
  slug!: string;

  @Column({ length: 160, nullable: true })
  metaDescription?: string;

  @Column({ type: 'text', nullable: true })
  excerpt?: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ nullable: true })
  featuredImage?: string;

  @Column({ length: 255, nullable: true })
  featuredImageAlt?: string;

  @Column({ type: 'enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT })
  status!: BlogPostStatus;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'int', default: 0 })
  viewCount!: number;

  // ─── Relations ────────────────────────────
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => BlogCategory, (c) => c.posts, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: BlogCategory;

  @ManyToMany(() => BlogTag, { cascade: true })
  @JoinTable({
    name: 'blog_post_tags',
    joinColumn: { name: 'postId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: BlogTag[];

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => Admin, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author!: Admin;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
