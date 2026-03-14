import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { WalletService } from '../wallet/wallet.service';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const adminService = new AdminService();
const adminAuthService = new AdminAuthService();
const walletService = new WalletService();

export class AdminController {
  // ─── Auth ───────────────────────────────────
  async login(req: Request, res: Response) {
    const result = await adminAuthService.login(req.body);
    return sendSuccess(res, result, 'Login successful');
  }

  async refreshToken(req: Request, res: Response) {
    const result = await adminAuthService.refreshToken(req.body.refreshToken);
    return sendSuccess(res, result, 'Token refreshed');
  }

  async logout(req: Request, res: Response) {
    const result = await adminAuthService.logout(req.body.refreshToken);
    return sendSuccess(res, result);
  }

  // ─── Admin Member Management ──────────────
  async createAdmin(req: AuthenticatedRequest, res: Response) {
    const admin = await adminService.createAdmin(req.user.sub, req.body);
    return sendCreated(res, admin, 'Admin member created');
  }

  async getAdminMembers(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getAdminMembers(req.query as any);
    return sendPaginated(res, result);
  }

  async getAdminById(req: AuthenticatedRequest, res: Response) {
    const admin = await adminService.getAdminById(req.params.id);
    return sendSuccess(res, admin);
  }

  async updatePermissions(req: AuthenticatedRequest, res: Response) {
    const admin = await adminService.updatePermissions(req.params.id, req.body);
    return sendSuccess(res, admin, 'Permissions updated');
  }

  async toggleSuperAdmin(req: AuthenticatedRequest, res: Response) {
    const admin = await adminService.toggleSuperAdmin(req.params.id, req.body.isSuperAdmin);
    return sendSuccess(res, admin, `Super admin ${admin.isSuperAdmin ? 'granted' : 'revoked'}`);
  }

  async removeAdmin(req: AuthenticatedRequest, res: Response) {
    await adminService.removeAdmin(req.params.id, req.user.sub);
    return sendSuccess(res, null, 'Admin member removed');
  }

  async listPermissions(_req: AuthenticatedRequest, res: Response) {
    const permissions = await adminService.listPermissions();
    return sendSuccess(res, permissions);
  }

  // ─── Dashboard ────────────────────────────
  async dashboard(_req: AuthenticatedRequest, res: Response) {
    const stats = await adminService.getDashboardStats();
    return sendSuccess(res, stats);
  }

  // ─── User Management ─────────────────────
  async getUsers(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getUsers(req.query as any);
    return sendPaginated(res, result);
  }

  async getUserById(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.getUserById(req.params.id);
    return sendSuccess(res, user);
  }

  async updateUser(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.updateUser(req.params.id, req.body);
    return sendSuccess(res, user, 'User updated');
  }

  async toggleUserActive(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.toggleUserActive(req.params.id);
    return sendSuccess(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  }

  async verifyUser(req: AuthenticatedRequest, res: Response) {
    const user = await adminService.verifyUserIdentity(req.params.id);
    return sendSuccess(res, user, 'User identity verified');
  }

  // ─── Property Moderation ─────────────────
  async getPendingProperties(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getPendingProperties(req.query as any);
    return sendPaginated(res, result);
  }

  async getPropertyById(req: AuthenticatedRequest, res: Response) {
    const property = await adminService.getPropertyById(req.params.id);
    return sendSuccess(res, property);
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

  // ─── Payments ─────────────────────────────
  async getAllPayments(req: AuthenticatedRequest, res: Response) {
    const result = await adminService.getAllPayments(req.query as any);
    return sendPaginated(res, result);
  }

  // ─── Wallets ──────────────────────────────
  async getAllWallets(req: AuthenticatedRequest, res: Response) {
    const result = await walletService.getAllWallets(req.query as any);
    return sendPaginated(res, result);
  }

  async getWalletTransactions(req: AuthenticatedRequest, res: Response) {
    const result = await walletService.getWalletTransactions(req.params.id, req.query as any);
    return sendPaginated(res, result);
  }

  async getAllWithdrawals(req: AuthenticatedRequest, res: Response) {
    const result = await walletService.getAllWithdrawals(req.query as any);
    return sendPaginated(res, result);
  }

  async approveWithdrawal(req: AuthenticatedRequest, res: Response) {
    const txn = await walletService.approveWithdrawal(req.params.id, req.user.sub);
    return sendSuccess(res, txn, 'Withdrawal approved');
  }

  async rejectWithdrawal(req: AuthenticatedRequest, res: Response) {
    const txn = await walletService.rejectWithdrawal(req.params.id, req.user.sub, req.body.reason);
    return sendSuccess(res, txn, 'Withdrawal rejected');
  }
}
