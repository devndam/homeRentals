import { Router } from 'express';
import { RentController } from './rent.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { resolveOrganisation, requireOrgPermission } from '../../middleware/organisation.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { RentFilterDto, SignRentAgreementDto } from './rent.dto';
import { OrgPermission } from '../../types';

const router = Router();
const ctrl = new RentController();

router.use(authenticate as any);

// List & detail
router.get('/', validateQuery(RentFilterDto), asyncHandler(ctrl.getMyRents as any));
router.get('/:id', asyncHandler(ctrl.findById as any));

// Tenant signs agreement
router.patch('/:id/sign', validateBody(SignRentAgreementDto), asyncHandler(ctrl.signAgreement as any));

// Owner terminates rental
router.patch('/:id/terminate', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_RENTS) as any, asyncHandler(ctrl.terminate as any));

export default router;
