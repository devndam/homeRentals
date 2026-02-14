import { Router } from 'express';
import { PaymentController } from './payment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { InitiatePaymentDto } from './payment.dto';

const router = Router();
const ctrl = new PaymentController();

// Paystack webhook — no auth, raw body for signature verification
router.post('/webhook', asyncHandler(ctrl.webhook));

// Authenticated routes
router.use(authenticate as any);

router.post('/initiate', validateBody(InitiatePaymentDto), asyncHandler(ctrl.initiate as any));
router.get('/verify/:reference', asyncHandler(ctrl.verify as any));
router.get('/', asyncHandler(ctrl.getMyPayments as any));
router.get('/:id', asyncHandler(ctrl.getPaymentById as any));

export default router;
