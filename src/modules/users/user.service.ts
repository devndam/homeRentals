import { AppDataSource } from '../../config/data-source';
import { User } from './user.entity';
import { ApiError } from '../../utils/api-error';
import { UpdateProfileDto, UpdateBankDetailsDto, UpdatePreferencesDto } from './user.dto';
import { WalletService } from '../wallet/wallet.service';
import { Property } from '../properties/property.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';
import { Payment } from '../payments/payment.entity';
import { Wallet } from '../wallet/wallet.entity';
import { Favorite } from '../properties/favorite.entity';

const userRepo = () => AppDataSource.getRepository(User);
const walletService = new WalletService();

export class UserService {
  async getProfile(userId: string) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    Object.assign(user, dto);
    await userRepo().save(user);
    return user;
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.bankName = dto.bankName;
    user.bankAccountNumber = dto.bankAccountNumber;
    user.bankAccountName = dto.bankAccountName;
    await userRepo().save(user);
    return user;
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.preferences = {
      ...user.preferences,
      ...dto,
    };
    await userRepo().save(user);
    return user;
  }

  async becomePropertyOwner(userId: string) {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    if (user.isPropertyOwner) throw ApiError.badRequest('You are already a property owner');

    user.isPropertyOwner = true;
    await userRepo().save(user);

    await walletService.createWalletForUser(userId);

    return user;
  }

  async getDashboardStats(userId: string, isPropertyOwner: boolean) {
    if (isPropertyOwner) {
      return this.getOwnerDashboard(userId);
    }
    return this.getTenantDashboard(userId);
  }

  private async getOwnerDashboard(userId: string) {
    const propertyRepo = AppDataSource.getRepository(Property);
    const bookingRepo = AppDataSource.getRepository(Booking);
    const agreementRepo = AppDataSource.getRepository(Agreement);
    const walletRepo = AppDataSource.getRepository(Wallet);

    const [properties, bookings, agreements, wallet] = await Promise.all([
      propertyRepo
        .createQueryBuilder('p')
        .select([
          'COUNT(*)::int AS "total"',
          'COUNT(*) FILTER (WHERE p.status = \'active\')::int AS "active"',
          'COUNT(*) FILTER (WHERE p.status = \'pending_review\')::int AS "pendingReview"',
          'COUNT(*) FILTER (WHERE p.status = \'rented\')::int AS "rented"',
          'COUNT(*) FILTER (WHERE p.status = \'suspended\')::int AS "suspended"',
          'COALESCE(SUM(p."viewCount"), 0)::int AS "totalViews"',
        ])
        .where('p."ownerId" = :userId', { userId })
        .getRawOne(),

      bookingRepo
        .createQueryBuilder('b')
        .select([
          'COUNT(*)::int AS "total"',
          'COUNT(*) FILTER (WHERE b.status = \'pending\')::int AS "pending"',
          'COUNT(*) FILTER (WHERE b.status = \'approved\')::int AS "approved"',
          'COUNT(*) FILTER (WHERE b.status = \'completed\')::int AS "completed"',
          'COUNT(*) FILTER (WHERE b.status = \'rejected\')::int AS "rejected"',
        ])
        .where('b."ownerId" = :userId', { userId })
        .getRawOne(),

      agreementRepo
        .createQueryBuilder('a')
        .select([
          'COUNT(*)::int AS "total"',
          'COUNT(*) FILTER (WHERE a.status = \'active\')::int AS "active"',
          'COUNT(*) FILTER (WHERE a.status IN (\'pending_tenant\', \'pending_owner\'))::int AS "pendingSignature"',
          'COUNT(*) FILTER (WHERE a.status = \'terminated\')::int AS "terminated"',
          'COUNT(*) FILTER (WHERE a.status = \'expired\')::int AS "expired"',
        ])
        .where('a."ownerId" = :userId', { userId })
        .getRawOne(),

      walletRepo.findOne({ where: { userId } }),
    ]);

    return {
      properties,
      bookings,
      agreements,
      wallet: wallet
        ? { balance: wallet.balance, totalEarned: wallet.totalEarned, totalWithdrawn: wallet.totalWithdrawn }
        : { balance: 0, totalEarned: 0, totalWithdrawn: 0 },
    };
  }

  private async getTenantDashboard(userId: string) {
    const bookingRepo = AppDataSource.getRepository(Booking);
    const agreementRepo = AppDataSource.getRepository(Agreement);
    const paymentRepo = AppDataSource.getRepository(Payment);
    const favoriteRepo = AppDataSource.getRepository(Favorite);

    const [bookings, agreements, payments, favorites] = await Promise.all([
      bookingRepo
        .createQueryBuilder('b')
        .select([
          'COUNT(*)::int AS "total"',
          'COUNT(*) FILTER (WHERE b.status = \'pending\')::int AS "pending"',
          'COUNT(*) FILTER (WHERE b.status = \'approved\')::int AS "approved"',
          'COUNT(*) FILTER (WHERE b.status = \'completed\')::int AS "completed"',
          'COUNT(*) FILTER (WHERE b.status = \'cancelled\')::int AS "cancelled"',
        ])
        .where('b."tenantId" = :userId', { userId })
        .getRawOne(),

      agreementRepo
        .createQueryBuilder('a')
        .select([
          'COUNT(*)::int AS "total"',
          'COUNT(*) FILTER (WHERE a.status = \'active\')::int AS "active"',
          'COUNT(*) FILTER (WHERE a.status IN (\'pending_tenant\', \'pending_owner\'))::int AS "pendingSignature"',
          'COUNT(*) FILTER (WHERE a.status = \'expired\')::int AS "expired"',
        ])
        .where('a."tenantId" = :userId', { userId })
        .getRawOne(),

      paymentRepo
        .createQueryBuilder('p')
        .select([
          'COALESCE(SUM(p.amount), 0)::numeric AS "totalPaid"',
          'COUNT(*) FILTER (WHERE p.status = \'success\')::int AS "count"',
        ])
        .where('p."userId" = :userId', { userId })
        .andWhere('p.status = :status', { status: 'success' })
        .getRawOne(),

      favoriteRepo.count({ where: { userId } }),
    ]);

    return {
      bookings,
      agreements,
      payments,
      favorites,
    };
  }

  async getOwnerPublicProfile(ownerId: string) {
    const user = await userRepo().findOne({
      where: { id: ownerId, isPropertyOwner: true },
      select: ['id', 'firstName', 'lastName', 'avatarUrl', 'createdAt', 'identityVerified'],
    });
    if (!user) throw ApiError.notFound('Property owner not found');
    return user;
  }
}
