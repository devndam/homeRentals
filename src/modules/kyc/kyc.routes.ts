import { Router } from 'express';
import { KycController } from './kyc.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadMedia } from '../../middleware/upload';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const ctrl = new KycController();

router.use(authenticate as any);

router.post('/', uploadMedia.single('document'), asyncHandler(ctrl.submit as any));
router.get('/', asyncHandler(ctrl.getMySubmissions as any));

export default router;
