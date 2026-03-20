import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { UpdateProfileDto, UpdateBankDetailsDto, UpdatePreferencesDto } from './user.dto';

const router = Router();
const ctrl = new UserController();

// All routes require authentication
router.use(authenticate as any);

router.get('/dashboard', asyncHandler(ctrl.getDashboard as any));
router.get('/search', asyncHandler(ctrl.searchUsers as any));
router.get('/profile', asyncHandler(ctrl.getProfile as any));
router.patch('/profile', validateBody(UpdateProfileDto), asyncHandler(ctrl.updateProfile as any));
router.put('/bank-details', requirePropertyOwner() as any, validateBody(UpdateBankDetailsDto), asyncHandler(ctrl.updateBankDetails as any));
router.put('/preferences', validateBody(UpdatePreferencesDto), asyncHandler(ctrl.updatePreferences as any));
router.patch('/become-owner', asyncHandler(ctrl.becomePropertyOwner as any));
router.get('/owners/:id', asyncHandler(ctrl.getOwnerProfile as any));

export default router;
