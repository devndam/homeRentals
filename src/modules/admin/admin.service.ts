import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';
import { ApiError } from '../../utils/api-error';
import {
  AdminPermission, ALL_ADMIN_PERMISSIONS,
  PaginatedResponse, PaginationQuery, PropertyStatus, PaymentStatus, UserRole,
} from '../../types';
import { CreateAdminDto, UpdateAdminPermissionsDto } from './admin.dto';
import { paginate } from '../../utils/pagination';

const userRepo = () => AppDataSource.getRepository(User);
const propertyRepo = () => AppDataSource.getRepository(Property);
const paymentRepo = () => AppDataSource.getRepository(Payment);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const agreementRepo = () => AppDataSource.getRepository(Agreement);

export class AdminService {
  // ═══════════════════════════════════════════════
  // ADMIN MEMBER MANAGEMENT
  // ═══════════════════════════════════════════════

  async createAdmin(creatorId: string, dto: CreateAdminDto): Promise<User> {
    const existing = await userRepo().findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });

    if (existing) {
      throw ApiError.conflict(
        existing.email === dto.email
          ? 'Email already registered'
          : 'Phone number already registered',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const admin = userRepo().create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      password: hashedPassword,
      role: UserRole.ADMIN,
      permissions: dto.permissions,
      isSuperAdmin: dto.isSuperAdmin || false,
      emailVerified: true,
      addedByAdminId: creatorId,
    });

    await userRepo().save(admin);

    return this.sanitizeAdmin(admin);
  }

  async getAdminMembers(query: PaginationQuery & { search?: string }): Promise<PaginatedResponse<User>> {
    const qb = userRepo()
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.ADMIN });

    if ((query as any).search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${(query as any).search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAdminById(adminId: string): Promise<User> {
    const admin = await userRepo().findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });
    if (!admin) throw ApiError.notFound('Admin not found');
    return admin;
  }

  async updatePermissions(adminId: string, dto: UpdateAdminPermissionsDto): Promise<User> {
    const admin = await userRepo().findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });
    if (!admin) throw ApiError.notFound('Admin not found');

    if (admin.isSuperAdmin) {
      throw ApiError.badRequest('Cannot modify permissions of a super admin');
    }

    admin.permissions = dto.permissions;
    await userRepo().save(admin);

    return admin;
  }

  async toggleSuperAdmin(adminId: string, isSuperAdmin: boolean): Promise<User> {
    const admin = await userRepo().findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });
    if (!admin) throw ApiError.notFound('Admin not found');

    admin.isSuperAdmin = isSuperAdmin;
    // Super admins don't need explicit permissions — they have all
    if (isSuperAdmin) {
      admin.permissions = [];
    }
    await userRepo().save(admin);

    return admin;
  }

  async removeAdmin(adminId: string, requesterId: string): Promise<void> {
    if (adminId === requesterId) {
      throw ApiError.badRequest('You cannot remove yourself');
    }

    const admin = await userRepo().findOne({
      where: { id: adminId, role: UserRole.ADMIN },
    });
    if (!admin) throw ApiError.notFound('Admin not found');

    if (admin.isSuperAdmin) {
      throw ApiError.badRequest('Cannot remove a super admin');
    }

    // Downgrade to tenant instead of deleting
    admin.role = UserRole.TENANT;
    admin.permissions = [];
    admin.isSuperAdmin = false;
    await userRepo().save(admin);
  }

  async listPermissions(): Promise<{ permission: string; description: string }[]> {
    const descriptions: Record<AdminPermission, string> = {
      [AdminPermission.MANAGE_ADMINS]: 'Add, edit, and remove admin members',
      [AdminPermission.VIEW_USERS]: 'View all platform users',
      [AdminPermission.TOGGLE_USER_STATUS]: 'Activate or deactivate user accounts',
      [AdminPermission.VERIFY_USER]: 'Verify user identity',
      [AdminPermission.VIEW_PROPERTIES]: 'View all property listings',
      [AdminPermission.APPROVE_PROPERTY]: 'Approve property listings',
      [AdminPermission.REJECT_PROPERTY]: 'Reject property listings',
      [AdminPermission.SUSPEND_PROPERTY]: 'Suspend property listings',
      [AdminPermission.VIEW_PAYMENTS]: 'View all payment transactions',
      [AdminPermission.PROCESS_REFUND]: 'Process payment refunds',
      [AdminPermission.VIEW_AGREEMENTS]: 'View all rental agreements',
      [AdminPermission.VIEW_DASHBOARD]: 'View dashboard analytics',
      [AdminPermission.MANAGE_DISPUTES]: 'Manage and resolve disputes',
    };

    return ALL_ADMIN_PERMISSIONS.map((p) => ({
      permission: p,
      description: descriptions[p],
    }));
  }

  // ═══════════════════════════════════════════════
  // DASHBOARD & EXISTING ADMIN FEATURES
  // ═══════════════════════════════════════════════

  async getDashboardStats() {
    const [totalUsers, totalLandlords, totalTenants, totalAdmins] = await Promise.all([
      userRepo().count(),
      userRepo().count({ where: { role: UserRole.LANDLORD } }),
      userRepo().count({ where: { role: UserRole.TENANT } }),
      userRepo().count({ where: { role: UserRole.ADMIN } }),
    ]);

    const [totalProperties, activeProperties, pendingProperties] = await Promise.all([
      propertyRepo().count(),
      propertyRepo().count({ where: { status: PropertyStatus.ACTIVE } }),
      propertyRepo().count({ where: { status: PropertyStatus.PENDING_REVIEW } }),
    ]);

    const totalBookings = await bookingRepo().count();
    const totalAgreements = await agreementRepo().count();

    const revenueResult = await paymentRepo()
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalRevenue')
      .addSelect('SUM(p.commission)', 'totalCommission')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne();

    return {
      users: { total: totalUsers, landlords: totalLandlords, tenants: totalTenants, admins: totalAdmins },
      properties: { total: totalProperties, active: activeProperties, pendingReview: pendingProperties },
      bookings: totalBookings,
      agreements: totalAgreements,
      revenue: {
        total: parseFloat(revenueResult?.totalRevenue || '0'),
        commission: parseFloat(revenueResult?.totalCommission || '0'),
      },
    };
  }

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

  async getAllPayments(query: PaginationQuery): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.property', 'prop');

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

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

  // ─── Helpers ──────────────────────────────────
  private sanitizeAdmin(user: User): User {
    const sanitized = { ...user };
    delete (sanitized as any).password;
    delete (sanitized as any).passwordResetToken;
    delete (sanitized as any).passwordResetExpires;
    return sanitized;
  }
}
