import { Request, Response } from 'express';
import { BlogService } from './blog.service';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const blogService = new BlogService();

export class BlogController {
  // ─── Public ────────────────────────────────────

  async listPublished(req: Request, res: Response) {
    const result = await blogService.findAllPosts(req.query as any, true);
    return sendPaginated(res, result);
  }

  async getBySlug(req: Request, res: Response) {
    const post = await blogService.findPostBySlug(req.params.slug as string, true);
    return sendSuccess(res, post);
  }

  async listCategories(_req: Request, res: Response) {
    const categories = await blogService.findAllCategories();
    return sendSuccess(res, categories);
  }

  async listTags(_req: Request, res: Response) {
    const tags = await blogService.findAllTags();
    return sendSuccess(res, tags);
  }

  // ─── Admin ─────────────────────────────────────

  async create(req: AuthenticatedRequest, res: Response) {
    const post = await blogService.createPost(req.user.sub, req.body);
    return sendCreated(res, post, 'Blog post created');
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const post = await blogService.updatePost(req.params.id, req.body);
    return sendSuccess(res, post, 'Blog post updated');
  }

  async uploadFeaturedImage(req: AuthenticatedRequest, res: Response) {
    const file = req.file as Express.Multer.File;
    if (!file) return sendSuccess(res, null, 'No file uploaded');
    const post = await blogService.uploadFeaturedImage(req.params.id, file);
    return sendSuccess(res, post, 'Featured image uploaded');
  }

  async deletePost(req: AuthenticatedRequest, res: Response) {
    await blogService.deletePost(req.params.id);
    return sendNoContent(res);
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const post = await blogService.findPostById(req.params.id);
    return sendSuccess(res, post);
  }

  async listAll(req: AuthenticatedRequest, res: Response) {
    const result = await blogService.findAllPosts(req.query as any, false);
    return sendPaginated(res, result);
  }

  // ─── Admin Categories ──────────────────────────

  async createCategory(req: AuthenticatedRequest, res: Response) {
    const category = await blogService.createCategory(req.body);
    return sendCreated(res, category, 'Category created');
  }

  async updateCategory(req: AuthenticatedRequest, res: Response) {
    const category = await blogService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, category, 'Category updated');
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response) {
    await blogService.deleteCategory(req.params.id);
    return sendNoContent(res);
  }

  // ─── Admin Tags ────────────────────────────────

  async deleteTag(req: AuthenticatedRequest, res: Response) {
    await blogService.deleteTag(req.params.id);
    return sendNoContent(res);
  }
}
