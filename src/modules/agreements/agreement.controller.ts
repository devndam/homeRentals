import { Response } from 'express';
import { AgreementService } from './agreement.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const agreementService = new AgreementService();

export class AgreementController {
  async create(req: AuthenticatedRequest, res: Response) {
    const agreement = await agreementService.create(req.user.sub, req.body);
    return sendCreated(res, agreement, 'Agreement created');
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const agreement = await agreementService.findById(req.params.id, req.user.sub);
    return sendSuccess(res, agreement);
  }

  async getMyAgreements(req: AuthenticatedRequest, res: Response) {
    const result = await agreementService.getUserAgreements(req.user.sub, req.user.role, req.query as any);
    return sendPaginated(res, result);
  }

  async signAsTenant(req: AuthenticatedRequest, res: Response) {
    const agreement = await agreementService.signAsTenant(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, agreement, 'Agreement signed by tenant');
  }

  async signAsOwner(req: AuthenticatedRequest, res: Response) {
    const agreement = await agreementService.signAsOwner(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, agreement, 'Agreement fully signed');
  }

  async terminate(req: AuthenticatedRequest, res: Response) {
    const agreement = await agreementService.terminate(req.params.id, req.user.sub);
    return sendSuccess(res, agreement, 'Agreement terminated');
  }
}