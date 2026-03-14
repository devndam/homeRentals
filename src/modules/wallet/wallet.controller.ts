import { Response } from 'express';
import { WalletService } from './wallet.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const walletService = new WalletService();

export class WalletController {
  async getMyWallet(req: AuthenticatedRequest, res: Response) {
    const wallet = await walletService.getMyWallet(req.user.sub);
    return sendSuccess(res, wallet);
  }

  async getMyTransactions(req: AuthenticatedRequest, res: Response) {
    const result = await walletService.getMyTransactions(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async requestWithdrawal(req: AuthenticatedRequest, res: Response) {
    const txn = await walletService.requestWithdrawal(req.user.sub, req.body);
    return sendSuccess(res, txn, 'Withdrawal request submitted for admin approval');
  }
}
