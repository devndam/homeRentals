import { Request, Response } from 'express';
import { SystemSettingsService } from './system-settings.service';
import { sendSuccess } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const service = new SystemSettingsService();

export class SystemSettingsController {
  async getSettings(_req: AuthenticatedRequest, res: Response) {
    const settings = await service.getSettings();
    return sendSuccess(res, settings);
  }

  async updateSettings(req: AuthenticatedRequest, res: Response) {
    const settings = await service.updateSettings(req.body);
    return sendSuccess(res, settings, 'Settings updated');
  }

  async getFeeBreakdown(req: Request, res: Response) {
    const rentAmount = parseFloat(req.query.rentAmount as string);
    if (isNaN(rentAmount) || rentAmount < 0) {
      return res.status(400).json({ success: false, message: 'Valid rentAmount is required' });
    }
    const settings = await service.getSettings();
    const breakdown = service.calculateFees(rentAmount, settings);
    return sendSuccess(res, breakdown);
  }

  async getRenewalFeeBreakdown(req: Request, res: Response) {
    const rentAmount = parseFloat(req.query.rentAmount as string);
    if (isNaN(rentAmount) || rentAmount < 0) {
      return res.status(400).json({ success: false, message: 'Valid rentAmount is required' });
    }
    const settings = await service.getSettings();
    const breakdown = service.calculateRenewalFees(rentAmount, settings);
    return sendSuccess(res, breakdown);
  }
}
