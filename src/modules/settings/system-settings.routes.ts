import { Router } from 'express';
import { SystemSettingsController } from './system-settings.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const ctrl = new SystemSettingsController();

// Public routes — no auth needed
router.get('/fees', asyncHandler(ctrl.getFeeBreakdown as any));
router.get('/fees/renewal', asyncHandler(ctrl.getRenewalFeeBreakdown as any));

export default router;
