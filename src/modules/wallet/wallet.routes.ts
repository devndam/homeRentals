import { Router } from 'express';
import { WalletController } from './wallet.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { RequestWithdrawalDto, TransactionFilterDto } from './wallet.dto';

const router = Router();
const ctrl = new WalletController();

router.use(authenticate as any);
router.use(requirePropertyOwner() as any);

router.get('/', asyncHandler(ctrl.getMyWallet as any));
router.get('/transactions', validateQuery(TransactionFilterDto), asyncHandler(ctrl.getMyTransactions as any));
router.post('/withdraw', validateBody(RequestWithdrawalDto), asyncHandler(ctrl.requestWithdrawal as any));

export default router;
