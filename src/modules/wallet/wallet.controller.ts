import { Response } from 'express';
import { WalletService } from './wallet.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const walletService = new WalletService();

export class WalletController {
  async getMyWallet(req: AuthenticatedRequest, res: Response) {
    const wallet = await walletService.getMyWallet(req.effectiveOwnerId!);
    return sendSuccess(res, wallet);
  }

  async getMyTransactions(req: AuthenticatedRequest, res: Response) {
    const result = await walletService.getMyTransactions(req.effectiveOwnerId!, req.query as any);
    return sendPaginated(res, result);
  }

  async requestWithdrawal(req: AuthenticatedRequest, res: Response) {
    const txn = await walletService.requestWithdrawal(req.effectiveOwnerId!, req.body);
    return sendSuccess(res, txn, 'Withdrawal request submitted for admin approval');
  }
}
