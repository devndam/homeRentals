import { Router } from 'express';
import { PropertyController } from './property.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { uploadMedia } from '../../middleware/upload';
import { CreatePropertyDto, UpdatePropertyDto, PropertyFilterDto } from './property.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new PropertyController();

// Public
router.get('/', validateQuery(PropertyFilterDto), asyncHandler(ctrl.findAll));
router.get('/:id', asyncHandler(ctrl.findById));

// Authenticated
router.use(authenticate as any);

// Tenant
router.post('/:id/favorite', asyncHandler(ctrl.toggleFavorite as any));
router.get('/me/favorites', asyncHandler(ctrl.getFavorites as any));

// Property Owner
router.post('/', authorize(UserRole.PROPERTY_OWNER) as any, validateBody(CreatePropertyDto), asyncHandler(ctrl.create as any));
router.get('/me/listings', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.findMyListings as any));
router.put('/:id', authorize(UserRole.PROPERTY_OWNER) as any, validateBody(UpdatePropertyDto), asyncHandler(ctrl.update as any));
router.delete('/:id', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.delete as any));
router.post('/:id/images', authorize(UserRole.PROPERTY_OWNER) as any, uploadMedia.array('images', 15), asyncHandler(ctrl.uploadImages as any));
router.delete('/:id/images/:imageId', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.deleteImage as any));

// Agent assignment
router.patch('/:id/assign-agent', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.assignAgent as any));
router.patch('/:id/remove-agent', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.removeAgent as any));

export default router;