import { Router } from 'express';
import { AgreementController } from './agreement.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateAgreementDto, SignAgreementDto } from './agreement.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new AgreementController();

router.use(authenticate as any);

router.get('/', asyncHandler(ctrl.getMyAgreements as any));
router.get('/:id', asyncHandler(ctrl.findById as any));

// Property Owner creates agreements
router.post('/', authorize(UserRole.PROPERTY_OWNER) as any, validateBody(CreateAgreementDto), asyncHandler(ctrl.create as any));
router.patch('/:id/sign/owner', authorize(UserRole.PROPERTY_OWNER) as any, validateBody(SignAgreementDto), asyncHandler(ctrl.signAsOwner as any));
router.patch('/:id/terminate', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.terminate as any));

// Tenant signs
router.patch('/:id/sign/tenant', authorize(UserRole.TENANT) as any, validateBody(SignAgreementDto), asyncHandler(ctrl.signAsTenant as any));

export default router;