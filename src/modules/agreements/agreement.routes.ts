import { Router } from 'express';
import { AgreementController } from './agreement.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateAgreementDto, SignAgreementDto, AgreementFilterDto } from './agreement.dto';

const router = Router();
const ctrl = new AgreementController();

router.use(authenticate as any);

router.get('/', validateQuery(AgreementFilterDto), asyncHandler(ctrl.getMyAgreements as any));
router.get('/:id', asyncHandler(ctrl.findById as any));

// Property Owner creates agreements
router.post('/', requirePropertyOwner() as any, validateBody(CreateAgreementDto), asyncHandler(ctrl.create as any));
router.patch('/:id/sign/owner', requirePropertyOwner() as any, validateBody(SignAgreementDto), asyncHandler(ctrl.signAsOwner as any));
router.patch('/:id/terminate', requirePropertyOwner() as any, asyncHandler(ctrl.terminate as any));

// Any authenticated user can sign as tenant (service validates tenantId)
router.patch('/:id/sign/tenant', validateBody(SignAgreementDto), asyncHandler(ctrl.signAsTenant as any));

export default router;
