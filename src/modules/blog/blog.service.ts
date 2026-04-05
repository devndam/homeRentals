import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { BlogPost } from './blog-post.entity';
import { BlogCategory } from './blog-category.entity';
import { BlogTag } from './blog-tag.entity';
import { ApiError } from '../../utils/api-error';
import { PaginatedResponse, BlogPostStatus } from '../../types';
import {
  CreateBlogPostDto, UpdateBlogPostDto, BlogPostFilterDto,
  CreateBlogCategoryDto, UpdateBlogCategoryDto,
} from './blog.dto';
import { paginate } from '../../utils/pagination';

const postRepo = () => AppDataSource.getRepository(BlogPost);
const categoryRepo = () => AppDataSource.getRepository(BlogCategory);
const tagRepo = () => AppDataSource.getRepository(BlogTag);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export class BlogService {
  // ─── Posts ──────────────────────────────────────

  async createPost(authorId: string, dto: CreateBlogPostDto): Promise<BlogPost> {
    const slug = dto.slug || slugify(dto.title);

    const existing = await postRepo().findOne({ where: { slug } });
    if (existing) throw ApiError.conflict('A post with this slug already exists');

    const post = postRepo().create({
      title: dto.title,
      slug,
      metaDescription: dto.metaDescription,
      excerpt: dto.excerpt,
      body: dto.body,
      featuredImageAlt: dto.featuredImageAlt,
      status: dto.status || BlogPostStatus.DRAFT,
      publishedAt: dto.status === BlogPostStatus.PUBLISHED ? new Date() : undefined,
      categoryId: dto.categoryId,
      authorId,
    });

    if (dto.tags?.length) {
      post.tags = await this.resolveOrCreateTags(dto.tags);
    }

    return postRepo().save(post);
  }

  async updatePost(id: string, dto: UpdateBlogPostDto): Promise<BlogPost> {
    const post = await postRepo().findOne({ where: { id }, relations: ['tags'] });
    if (!post) throw ApiError.notFound('Blog post not found');

    if (dto.slug && dto.slug !== post.slug) {
      const existing = await postRepo().findOne({ where: { slug: dto.slug } });
      if (existing) throw ApiError.conflict('A post with this slug already exists');
    }

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.slug !== undefined) post.slug = dto.slug;
    if (dto.metaDescription !== undefined) post.metaDescription = dto.metaDescription;
    if (dto.excerpt !== undefined) post.excerpt = dto.excerpt;
    if (dto.body !== undefined) post.body = dto.body;
    if (dto.featuredImageAlt !== undefined) post.featuredImageAlt = dto.featuredImageAlt;
    if (dto.categoryId !== undefined) post.categoryId = dto.categoryId;

    if (dto.status !== undefined) {
      post.status = dto.status;
      if (dto.status === BlogPostStatus.PUBLISHED && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    if (dto.tags !== undefined) {
      post.tags = await this.resolveOrCreateTags(dto.tags);
    }

    return postRepo().save(post);
  }

  async uploadFeaturedImage(id: string, file: Express.Multer.File): Promise<BlogPost> {
    const post = await postRepo().findOne({ where: { id } });
    if (!post) throw ApiError.notFound('Blog post not found');

    post.featuredImage = file.storageUrl || `/uploads/${file.filename}`;
    return postRepo().save(post);
  }

  async deletePost(id: string): Promise<void> {
    const post = await postRepo().findOne({ where: { id } });
    if (!post) throw ApiError.notFound('Blog post not found');
    await postRepo().remove(post);
  }

  async findAllPosts(filters: BlogPostFilterDto, publishedOnly = false): Promise<PaginatedResponse<BlogPost>> {
    const qb = postRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.tags', 'tag')
      .leftJoinAndSelect('p.author', 'author')
      .select([
        'p.id', 'p.title', 'p.slug', 'p.metaDescription', 'p.excerpt',
        'p.featuredImage', 'p.featuredImageAlt', 'p.status', 'p.publishedAt',
        'p.viewCount', 'p.categoryId', 'p.authorId', 'p.createdAt', 'p.updatedAt',
        'cat.id', 'cat.name', 'cat.slug',
        'tag.id', 'tag.name', 'tag.slug',
        'author.id', 'author.email',
      ]);

    if (publishedOnly) {
      qb.where('p.status = :status', { status: BlogPostStatus.PUBLISHED });
    } else if (filters.status) {
      qb.where('p.status = :status', { status: filters.status });
    }

    if (filters.search) {
      qb.andWhere(
        '(p.title ILIKE :search OR p.excerpt ILIKE :search OR p.metaDescription ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    if (filters.tag) {
      qb.andWhere('tag.slug = :tagSlug', { tagSlug: filters.tag });
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'publishedAt',
      order: filters.order || 'DESC',
    });
  }

  async findPostBySlug(slug: string, publishedOnly = false): Promise<BlogPost> {
    const qb = postRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.tags', 'tag')
      .leftJoinAndSelect('p.author', 'author')
      .select([
        'p', 'cat.id', 'cat.name', 'cat.slug',
        'tag.id', 'tag.name', 'tag.slug',
        'author.id', 'author.email',
      ])
      .where('p.slug = :slug', { slug });

    if (publishedOnly) {
      qb.andWhere('p.status = :status', { status: BlogPostStatus.PUBLISHED });
    }

    const post = await qb.getOne();
    if (!post) throw ApiError.notFound('Blog post not found');

    await postRepo().increment({ id: post.id }, 'viewCount', 1);
    return post;
  }

  async findPostById(id: string): Promise<BlogPost> {
    const post = await postRepo().findOne({
      where: { id },
      relations: ['category', 'tags', 'author'],
    });
    if (!post) throw ApiError.notFound('Blog post not found');
    return post;
  }

  // ─── Categories ────────────────────────────────

  async createCategory(dto: CreateBlogCategoryDto): Promise<BlogCategory> {
    const slug = dto.slug || slugify(dto.name);

    const existing = await categoryRepo().findOne({ where: { slug } });
    if (existing) throw ApiError.conflict('A category with this slug already exists');

    const category = categoryRepo().create({ ...dto, slug });
    return categoryRepo().save(category);
  }

  async updateCategory(id: string, dto: UpdateBlogCategoryDto): Promise<BlogCategory> {
    const category = await categoryRepo().findOne({ where: { id } });
    if (!category) throw ApiError.notFound('Blog category not found');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await categoryRepo().findOne({ where: { slug: dto.slug } });
      if (existing) throw ApiError.conflict('A category with this slug already exists');
    }

    Object.assign(category, dto);
    if (dto.name && !dto.slug) category.slug = slugify(dto.name);

    return categoryRepo().save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await categoryRepo().findOne({ where: { id } });
    if (!category) throw ApiError.notFound('Blog category not found');
    await categoryRepo().remove(category);
  }

  async findAllCategories(): Promise<BlogCategory[]> {
    return categoryRepo().find({ order: { name: 'ASC' } });
  }

  // ─── Tags ──────────────────────────────────────

  async findAllTags(): Promise<BlogTag[]> {
    return tagRepo().find({ order: { name: 'ASC' } });
  }

  async deleteTag(id: string): Promise<void> {
    const tag = await tagRepo().findOne({ where: { id } });
    if (!tag) throw ApiError.notFound('Tag not found');
    await tagRepo().remove(tag);
  }

  // ─── Helpers ───────────────────────────────────

  private async resolveOrCreateTags(tagNames: string[]): Promise<BlogTag[]> {
    const tags: BlogTag[] = [];

    for (const name of tagNames) {
      const slug = slugify(name);
      let tag = await tagRepo().findOne({ where: { slug } });
      if (!tag) {
        tag = tagRepo().create({ name: name.trim(), slug });
        tag = await tagRepo().save(tag);
      }
      tags.push(tag);
    }

    return tags;
  }
}
