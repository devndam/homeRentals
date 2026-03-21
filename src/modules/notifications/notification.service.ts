import { AppDataSource } from '../../config/data-source';
import { Notification } from './notification.entity';
import { NotificationType, PaginatedResponse } from '../../types';
import { paginate } from '../../utils/pagination';
import { NotificationFilterDto } from './notification.dto';
import { ApiError } from '../../utils/api-error';

const notificationRepo = () => AppDataSource.getRepository(Notification);

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export class NotificationService {
  async create(input: CreateNotificationInput): Promise<Notification> {
    const notification = notificationRepo().create(input);
    return notificationRepo().save(notification);
  }

  async getUserNotifications(
    userId: string,
    filters: NotificationFilterDto,
  ): Promise<PaginatedResponse<Notification>> {
    const qb = notificationRepo()
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId });

    if (filters.type) {
      qb.andWhere('n.type = :type', { type: filters.type });
    }

    return paginate(qb, {
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort || 'createdAt',
      order: filters.order || 'DESC',
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return notificationRepo().count({
      where: { userId, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await notificationRepo().findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) throw ApiError.notFound('Notification not found');
    notification.isRead = true;
    return notificationRepo().save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await notificationRepo()
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('userId = :userId', { userId })
      .andWhere('isRead = false')
      .execute();
  }
}
