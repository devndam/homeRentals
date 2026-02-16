import { Response } from 'express';
import { KycService } from './kyc.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const kycService = new KycService();

export class KycController {
  async submit(req: AuthenticatedRequest, res: Response) {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Document file is required' });
    }
    const doc = await kycService.submit(req.user.sub, req.body, req.file);
    return sendCreated(res, doc, 'KYC document submitted successfully');
  }

  async getMySubmissions(req: AuthenticatedRequest, res: Response) {
    const docs = await kycService.getMySubmissions(req.user.sub);
    return sendSuccess(res, docs);
  }

  // ─── Admin methods ─────────────────────────

  async getAllSubmissions(req: AuthenticatedRequest, res: Response) {
    const result = await kycService.getAllSubmissions(req.query as any);
    return sendPaginated(res, result);
  }

  async getSubmissionById(req: AuthenticatedRequest, res: Response) {
    const doc = await kycService.getSubmissionById(req.params.id);
    return sendSuccess(res, doc);
  }

  async approve(req: AuthenticatedRequest, res: Response) {
    const doc = await kycService.approve(req.params.id, req.user.sub);
    return sendSuccess(res, doc, 'KYC approved');
  }

  async reject(req: AuthenticatedRequest, res: Response) {
    const doc = await kycService.reject(req.params.id, req.user.sub, req.body.reason);
    return sendSuccess(res, doc, 'KYC rejected');
  }
}
