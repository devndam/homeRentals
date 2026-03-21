import { Response } from 'express';
import { NotificationService } from './notification.service';
import { sendSuccess, sendPaginated } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const service = new NotificationService();

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response) {
    const result = await service.getUserNotifications(req.user.sub, req.query as any);
    return sendPaginated(res, result);
  }

  async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    const count = await service.getUnreadCount(req.user.sub);
    return sendSuccess(res, { count });
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    const notification = await service.markAsRead(req.params.id, req.user.sub);
    return sendSuccess(res, notification, 'Notification marked as read');
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    await service.markAllAsRead(req.user.sub);
    return sendSuccess(res, null, 'All notifications marked as read');
  }
}
