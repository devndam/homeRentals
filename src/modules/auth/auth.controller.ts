import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body);
    return sendCreated(res, result, 'Registration successful');
  }

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    return sendSuccess(res, result, 'Login successful');
  }

  async refreshToken(req: Request, res: Response) {
    const result = await authService.refreshToken(req.body.refreshToken);
    return sendSuccess(res, result, 'Token refreshed');
  }

  async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword(req.body.email);
    return sendSuccess(res, result);
  }

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, result);
  }

  async changePassword(req: AuthenticatedRequest, res: Response) {
    const result = await authService.changePassword(
      req.user.sub,
      req.body.currentPassword,
      req.body.newPassword,
    );
    return sendSuccess(res, result);
  }

  async logout(req: Request, res: Response) {
    const result = await authService.logout(req.body.refreshToken);
    return sendSuccess(res, result);
  }

  async me(req: AuthenticatedRequest, res: Response) {
    return sendSuccess(res, req.user, 'Current user');
  }
}
