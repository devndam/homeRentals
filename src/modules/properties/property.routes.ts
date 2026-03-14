import { Router } from 'express';
import { PropertyController } from './property.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { uploadMedia } from '../../middleware/upload';
import { CreatePropertyDto, UpdatePropertyDto, PropertyFilterDto } from './property.dto';

const router = Router();
const ctrl = new PropertyController();

// Public
router.get('/', validateQuery(PropertyFilterDto), asyncHandler(ctrl.findAll));
router.get('/:id', asyncHandler(ctrl.findById));

// Authenticated
router.use(authenticate as any);

// Any user
router.post('/:id/favorite', asyncHandler(ctrl.toggleFavorite as any));
router.get('/me/favorites', asyncHandler(ctrl.getFavorites as any));

// Property Owner
router.post('/', requirePropertyOwner() as any, validateBody(CreatePropertyDto), asyncHandler(ctrl.create as any));
router.get('/me/listings', requirePropertyOwner() as any, asyncHandler(ctrl.findMyListings as any));
router.put('/:id', requirePropertyOwner() as any, validateBody(UpdatePropertyDto), asyncHandler(ctrl.update as any));
router.delete('/:id', requirePropertyOwner() as any, asyncHandler(ctrl.delete as any));
router.post('/:id/images', requirePropertyOwner() as any, uploadMedia.array('images', 15), asyncHandler(ctrl.uploadImages as any));
router.delete('/:id/images/:imageId', requirePropertyOwner() as any, asyncHandler(ctrl.deleteImage as any));

export default router;
