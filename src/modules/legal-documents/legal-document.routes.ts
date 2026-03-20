import { Router } from 'express';
import { LegalDocumentController } from './legal-document.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const ctrl = new LegalDocumentController();

router.use(authenticate as any);

router.get('/', asyncHandler(ctrl.getMyDocuments as any));
router.patch('/:id/acknowledge', asyncHandler(ctrl.acknowledge as any));

export default router;
