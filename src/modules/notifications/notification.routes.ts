import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';

const router = Router();
const ctrl = new NotificationController();

router.use(authenticate as any);

router.get('/', asyncHandler(ctrl.getNotifications as any));
router.get('/unread-count', asyncHandler(ctrl.getUnreadCount as any));
router.patch('/:id/read', asyncHandler(ctrl.markAsRead as any));
router.patch('/read-all', asyncHandler(ctrl.markAllAsRead as any));

export default router;
