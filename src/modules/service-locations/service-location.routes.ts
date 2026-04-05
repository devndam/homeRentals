import { Router } from 'express';
import { ServiceLocationController } from './service-location.controller';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const ctrl = new ServiceLocationController();

// Public — get active service locations (for search dropdowns)
router.get('/active', asyncHandler(ctrl.getActiveLocations as any));

export default router;
