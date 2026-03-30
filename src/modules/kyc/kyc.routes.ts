import { Router } from 'express';
import { KycController } from './kyc.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { uploadMedia, processUpload } from '../../middleware/upload';
import { validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { KycListQueryDto } from './kyc.dto';

const router = Router();
const ctrl = new KycController();

router.use(authenticate as any);

router.post('/', uploadMedia.single('document'), processUpload as any, asyncHandler(ctrl.submit as any));
router.get('/', validateQuery(KycListQueryDto), asyncHandler(ctrl.getMySubmissions as any));

export default router;
