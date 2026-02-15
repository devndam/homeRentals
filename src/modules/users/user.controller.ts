import { Response } from 'express';
import { UserService } from './user.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const userService = new UserService();

export class UserController {
  async getProfile(req: AuthenticatedRequest, res: Response) {
    const user = await userService.getProfile(req.user.sub);
    return sendSuccess(res, user);
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updateProfile(req.user.sub, req.body);
    return sendSuccess(res, user, 'Profile updated');
  }

  async updateBankDetails(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updateBankDetails(req.user.sub, req.body);
    return sendSuccess(res, user, 'Bank details updated');
  }

  async updatePreferences(req: AuthenticatedRequest, res: Response) {
    const user = await userService.updatePreferences(req.user.sub, req.body);
    return sendSuccess(res, user, 'Preferences updated');
  }

  async getOwnerProfile(req: AuthenticatedRequest, res: Response) {
    const profile = await userService.getOwnerPublicProfile(req.params.id);
    return sendSuccess(res, profile);
  }
}