import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const adminService = new AdminService();

export class AdminController {
  async dashboard(req: AuthenticatedRequest, res: Response) {
    const stats = await adminService.getDashboardStats();
    return sendSuccess(res, stats);
  }

  async getUsers(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getUsers(req.query as any);
    return sendPaginated(res, result);
  }

  async toggleUserActive(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.toggleUserActive(req.params.id);
    return sendSuccess(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  }

  async verifyUser(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.verifyUserIdentity(req.params.id);
    return sendSuccess(res, user, 'User identity verified');
  }

  async getPendingProperties(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getPendingProperties(req.query as any);
    return sendPaginated(res, result);
  }

  async getAllProperties(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getAllProperties(req.query as any);
    return sendPaginated(res, result);
  }

  async approveProperty(req: AuthenticatedRequest, res: Response) {
    const property = await adminService.approveProperty(req.params.id);
    return sendSuccess(res, property, 'Property approved');
  }

  async rejectProperty(req: AuthenticatedRequest, res: Response) {
    const property = await adminService.rejectProperty(req.params.id, req.body.reason);
    return sendSuccess(res, property, 'Property rejected');
  }

  async suspendProperty(req: AuthenticatedRequest, res: Response) {
    const property = await adminService.suspendProperty(req.params.id, req.body.reason);
    return sendSuccess(res, property, 'Property suspended');
  }

  async getAllPayments(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getAllPayments(req.query as any);
    return sendPaginated(res, result);
  }
}
