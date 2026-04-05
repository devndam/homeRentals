import { Router } from 'express';
import { BlogController } from './blog.controller';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { BlogPostFilterDto } from './blog.dto';

const router = Router();
const ctrl = new BlogController();

// Public — published posts only
router.get('/', validateQuery(BlogPostFilterDto), asyncHandler(ctrl.listPublished));
router.get('/categories', asyncHandler(ctrl.listCategories));
router.get('/tags', asyncHandler(ctrl.listTags));
router.get('/:slug', asyncHandler(ctrl.getBySlug));

export default router;
