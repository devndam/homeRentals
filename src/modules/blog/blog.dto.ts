import { IsString, IsOptional, IsEnum, IsArray, MaxLength, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { BlogPostStatus } from '../../types';

// ─── Blog Post DTOs ─────────────────────────────

export class CreateBlogPostDto {
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(280)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  body!: string;

  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateBlogPostDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(280)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  metaDescription?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  featuredImageAlt?: string;

  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class BlogPostFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsEnum(BlogPostStatus)
  @IsOptional()
  status?: BlogPostStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sort?: string;

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC';
}

// ─── Blog Category DTOs ─────────────────────────

export class CreateBlogCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBlogCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
