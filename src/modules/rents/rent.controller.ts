import { Response } from 'express';
import { RentService } from './rent.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const rentService = new RentService();

export class RentController {
  async getMyRents(req: AuthenticatedRequest, res: Response) {
    const result = await rentService.getUserRents(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const rent = await rentService.findById(req.params.id, req.user.sub);
    return sendSuccess(res, rent);
  }

  async signAgreement(req: AuthenticatedRequest, res: Response) {
    const rent = await rentService.signAgreement(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, rent, 'Agreement signed');
  }

  async terminate(req: AuthenticatedRequest, res: Response) {
    const rent = await rentService.terminate(req.params.id, req.effectiveOwnerId!);
    return sendSuccess(res, rent, 'Rental terminated');
  }
}

// Admin controller methods (used by admin routes)
export class AdminRentController {
  async getAllRents(req: AuthenticatedRequest, res: Response) {
    const result = await rentService.getAllRents(req.query as any);
    return sendPaginated(res, result);
  }

  async terminateRent(req: AuthenticatedRequest, res: Response) {
    const rent = await rentService.adminTerminate(req.params.id);
    return sendSuccess(res, rent, 'Rental terminated by admin');
  }
}
