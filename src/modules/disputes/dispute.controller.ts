import { Response } from 'express';
import { DisputeService } from './dispute.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const disputeService = new DisputeService();

export class DisputeController {
  async list(req: AuthenticatedRequest, res: Response) {
    const result = await disputeService.list(req.query as any);
    return sendPaginated(res, result);
  }

  async getById(req: AuthenticatedRequest, res: Response) {
    const dispute = await disputeService.getById(req.params.id);
    return sendSuccess(res, dispute);
  }

  async updateStatus(req: AuthenticatedRequest, res: Response) {
    const dispute = await disputeService.updateStatus(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, dispute, 'Dispute status updated');
  }
}
