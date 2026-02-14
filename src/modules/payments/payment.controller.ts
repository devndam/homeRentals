import { Request, Response } from 'express';
import crypto from 'crypto';
import { PaymentService } from './payment.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';
import { env } from '../../config/env';

const paymentService = new PaymentService();

export class PaymentController {
  async initiate(req: AuthenticatedRequest, res: Response) {
    const result = await paymentService.initiate(req.user.sub, req.body);
    return sendCreated(res, result, 'Payment initiated');
  }

  async verify(req: AuthenticatedRequest, res: Response) {
    const payment = await paymentService.verify(req.params.reference);
    return sendSuccess(res, payment, 'Payment verified');
  }

  async webhook(req: Request, res: Response) {
    // Validate Paystack webhook signature
    const hash = crypto
      .createHmac('sha512', env.paystack.webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    await paymentService.handleWebhook(req.body);

    // Always return 200 to Paystack
    return res.status(200).send('OK');
  }

  async getMyPayments(req: AuthenticatedRequest, res: Response) {
    const result = await paymentService.getUserPayments(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async getPaymentById(req: AuthenticatedRequest, res: Response) {
    const payment = await paymentService.getPaymentById(req.params.id, req.user.sub);
    return sendSuccess(res, payment);
  }
}
