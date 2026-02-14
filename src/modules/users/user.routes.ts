import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { UpdateProfileDto, UpdateBankDetailsDto, UpdatePreferencesDto } from './user.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new UserController();

// All routes require authentication
router.use(authenticate as any);

router.get('/profile', asyncHandler(ctrl.getProfile as any));
router.patch('/profile', validateBody(UpdateProfileDto), asyncHandler(ctrl.updateProfile as any));
router.put('/bank-details', authorize(UserRole.LANDLORD) as any, validateBody(UpdateBankDetailsDto), asyncHandler(ctrl.updateBankDetails as any));
router.put('/preferences', authorize(UserRole.TENANT) as any, validateBody(UpdatePreferencesDto), asyncHandler(ctrl.updatePreferences as any));
router.get('/landlords/:id', asyncHandler(ctrl.getLandlordProfile as any));

export default router;
