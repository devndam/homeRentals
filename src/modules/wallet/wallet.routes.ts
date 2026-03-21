import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { resolveOrganisation, requireOrgPermission } from '../../middleware/organisation.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { RequestWithdrawalDto, TransactionFilterDto } from './wallet.dto';
import { OrgPermission } from '../../types';

const router = Router();
const ctrl = new WalletController();

router.use(authenticate as any);
router.use(requirePropertyOwner() as any);
router.use(resolveOrganisation() as any);

router.get('/', requireOrgPermission(OrgPermission.VIEW_WALLET) as any, asyncHandler(ctrl.getMyWallet as any));
router.get('/transactions', requireOrgPermission(OrgPermission.VIEW_WALLET) as any, validateQuery(TransactionFilterDto), asyncHandler(ctrl.getMyTransactions as any));
router.post('/withdraw', requireOrgPermission(OrgPermission.VIEW_WALLET) as any, validateBody(RequestWithdrawalDto), asyncHandler(ctrl.requestWithdrawal as any));

export default router;
