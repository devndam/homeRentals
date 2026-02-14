import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';
import { ApiError } from '../../utils/api-error';
import { PaginatedResponse, PaginationQuery, PropertyStatus, PaymentStatus, UserRole } from '../../types';
import { paginate } from '../../utils/pagination';

const userRepo = () => AppDataSource.getRepository(User);
const propertyRepo = () => AppDataSource.getRepository(Property);
const paymentRepo = () => AppDataSource.getRepository(Payment);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const agreementRepo = () => AppDataSource.getRepository(Agreement);

export class AdminService {
  // ─── Dashboard Analytics ──────────────────
  async getDashboardStats() {
    const [totalUsers, totalLandlords, totalTenants] = await Promise.all([
      userRepo().count(),
      userRepo().count({ where: { role: UserRole.LANDLORD } }),
      userRepo().count({ where: { role: UserRole.TENANT } }),
    ]);

    const [totalProperties, activeProperties, pendingProperties] = await Promise.all([
      propertyRepo().count(),
      propertyRepo().count({ where: { status: PropertyStatus.ACTIVE } }),
      propertyRepo().count({ where: { status: PropertyStatus.PENDING_REVIEW } }),
    ]);

    const totalBookings = await bookingRepo().count();
    const totalAgreements = await agreementRepo().count();

    // Revenue stats
    const revenueResult = await paymentRepo()
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalRevenue')
      .addSelect('SUM(p.commission)', 'totalCommission')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne();

    return {
      users: { total: totalUsers, landlords: totalLandlords, tenants: totalTenants },
      properties: { total: totalProperties, active: activeProperties, pendingReview: pendingProperties },
      bookings: totalBookings,
      agreements: totalAgreements,
      revenue: {
        total: parseFloat(revenueResult?.totalRevenue || '0'),
        commission: parseFloat(revenueResult?.totalCommission || '0'),
      },
    };
  }

  // ─── User Management ─────────────────────
  async getUsers(query: PaginationQuery & { role?: UserRole; search?: string }): Promise<PaginatedResponse<User>> {
    const qb = userRepo().createQueryBuilder('u');

    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if ((query as any).search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${(query as any).search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async toggleUserActive(userId: string): Promise<User> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.isActive = !user.isActive;
    return userRepo().save(user);
  }

  async verifyUserIdentity(userId: string): Promise<User> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    user.identityVerified = true;
    return userRepo().save(user);
  }

  // ─── Property Moderation ─────────────────
  async getPendingProperties(query: PaginationQuery): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.landlord', 'landlord')
      .where('p.status = :status', { status: PropertyStatus.PENDING_REVIEW });

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'ASC' });
  }

  async approveProperty(propertyId: string): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id: propertyId } });
    if (!property) throw ApiError.notFound('Property not found');

    if (property.status !== PropertyStatus.PENDING_REVIEW) {
      throw ApiError.badRequest('Property is not pending review');
    }

    property.status = PropertyStatus.ACTIVE;
    property.rejectionReason = undefined;
    return propertyRepo().save(property);
  }

  async rejectProperty(propertyId: string, reason: string): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id: propertyId } });
    if (!property) throw ApiError.notFound('Property not found');

    property.status = PropertyStatus.SUSPENDED;
    property.rejectionReason = reason;
    return propertyRepo().save(property);
  }

  async suspendProperty(propertyId: string, reason: string): Promise<Property> {
    const property = await propertyRepo().findOne({ where: { id: propertyId } });
    if (!property) throw ApiError.notFound('Property not found');

    property.status = PropertyStatus.SUSPENDED;
    property.rejectionReason = reason;
    return propertyRepo().save(property);
  }

  // ─── Payments Overview ────────────────────
  async getAllPayments(query: PaginationQuery): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.property', 'prop');

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  // ─── All Properties ──────────────────────
  async getAllProperties(query: PaginationQuery & { status?: PropertyStatus }): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.landlord', 'landlord');

    if ((query as any).status) {
      qb.andWhere('p.status = :status', { status: (query as any).status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }
}
