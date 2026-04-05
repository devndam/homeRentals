import { Request, Response } from 'express';
import { ServiceLocationService } from './service-location.service';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const service = new ServiceLocationService();

export class ServiceLocationController {
  async create(req: AuthenticatedRequest, res: Response) {
    const location = await service.create(req.body);
    return sendCreated(res, location, 'Service location created');
  }

  async findAll(req: AuthenticatedRequest, res: Response) {
    const result = await service.findAll(req.query as any);
    return sendPaginated(res, result);
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const location = await service.findById(req.params.id);
    return sendSuccess(res, location);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const location = await service.update(req.params.id, req.body);
    return sendSuccess(res, location, 'Service location updated');
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    await service.delete(req.params.id);
    return sendNoContent(res);
  }

  // Public endpoint
  async getActiveLocations(_req: Request, res: Response) {
    const locations = await service.getActiveLocations();
    return sendSuccess(res, locations);
  }
}
