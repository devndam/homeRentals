import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { Admin } from './admin.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { Agreement } from '../agreements/agreement.entity';
import { ApiError } from '../../utils/api-error';
import {
  AdminPermission, ALL_ADMIN_PERMISSIONS,
  PaginatedResponse, PaginationQuery, PropertyStatus, PaymentStatus,
} from '../../types';
import { CreateAdminDto, UpdateAdminPermissionsDto, UpdateUserDto } from './admin.dto';
import { paginate } from '../../utils/pagination';

const adminRepo = () => AppDataSource.getRepository(Admin);
const userRepo = () => AppDataSource.getRepository(User);
const propertyRepo = () => AppDataSource.getRepository(Property);
const paymentRepo = () => AppDataSource.getRepository(Payment);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const agreementRepo = () => AppDataSource.getRepository(Agreement);

export class AdminService {
  // ═══════════════════════════════════════════════
  // ADMIN MEMBER MANAGEMENT
  // ═══════════════════════════════════════════════

  async createAdmin(creatorId: string, dto: CreateAdminDto): Promise<Admin> {
    const existing = await adminRepo().findOne({
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

    const admin = adminRepo().create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email.toLowerCase().trim(),
      phone: dto.phone,
      password: hashedPassword,
      permissions: dto.permissions,
      isSuperAdmin: dto.isSuperAdmin || false,
      addedByAdminId: creatorId,
    });

    await adminRepo().save(admin);

    return this.sanitizeAdmin(admin);
  }

  async getAdminMembers(query: PaginationQuery & { search?: string }): Promise<PaginatedResponse<Admin>> {
    const qb = adminRepo().createQueryBuilder('a');

    if ((query as any).search) {
      qb.andWhere(
        '(a.firstName ILIKE :s OR a.lastName ILIKE :s OR a.email ILIKE :s)',
        { s: `%${(query as any).search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAdminById(adminId: string): Promise<Admin> {
    const admin = await adminRepo().findOne({ where: { id: adminId } });
    if (!admin) throw ApiError.notFound('Admin not found');
    return admin;
  }

  async updatePermissions(adminId: string, dto: UpdateAdminPermissionsDto): Promise<Admin> {
    const admin = await adminRepo().findOne({ where: { id: adminId } });
    if (!admin) throw ApiError.notFound('Admin not found');

    if (admin.isSuperAdmin) {
      throw ApiError.badRequest('Cannot modify permissions of a super admin');
    }

    admin.permissions = dto.permissions;
    await adminRepo().save(admin);

    return admin;
  }

  async toggleSuperAdmin(adminId: string, isSuperAdmin: boolean): Promise<Admin> {
    const admin = await adminRepo().findOne({ where: { id: adminId } });
    if (!admin) throw ApiError.notFound('Admin not found');

    admin.isSuperAdmin = isSuperAdmin;
    if (isSuperAdmin) {
      admin.permissions = [];
    }
    await adminRepo().save(admin);

    return admin;
  }

  async removeAdmin(adminId: string, requesterId: string): Promise<void> {
    if (adminId === requesterId) {
      throw ApiError.badRequest('You cannot remove yourself');
    }

    const admin = await adminRepo().findOne({ where: { id: adminId } });
    if (!admin) throw ApiError.notFound('Admin not found');

    if (admin.isSuperAdmin) {
      throw ApiError.badRequest('Cannot remove a super admin');
    }

    await adminRepo().remove(admin);
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
      [AdminPermission.MANAGE_KYC]: 'Review, approve, and reject KYC submissions',
      [AdminPermission.MANAGE_WALLETS]: 'View wallets, approve or reject withdrawal requests',
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
    const [totalUsers, totalOwners, totalAdmins] = await Promise.all([
      userRepo().count(),
      userRepo().count({ where: { isPropertyOwner: true } }),
      adminRepo().count(),
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
      users: { total: totalUsers, propertyOwners: totalOwners, admins: totalAdmins },
      properties: { total: totalProperties, active: activeProperties, pendingReview: pendingProperties },
      bookings: totalBookings,
      agreements: totalAgreements,
      revenue: {
        total: parseFloat(revenueResult?.totalRevenue || '0'),
        commission: parseFloat(revenueResult?.totalCommission || '0'),
      },
    };
  }

  async getUsers(query: PaginationQuery & { isPropertyOwner?: boolean; search?: string }): Promise<PaginatedResponse<User>> {
    const qb = userRepo().createQueryBuilder('u');

    if (query.isPropertyOwner !== undefined) qb.andWhere('u.isPropertyOwner = :isPropertyOwner', { isPropertyOwner: query.isPropertyOwner });
    if ((query as any).search) {
      qb.andWhere(
        '(u.firstName ILIKE :s OR u.lastName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${(query as any).search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getUserById(userId: string): Promise<User> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await userRepo().findOne({ where: { email: dto.email } });
      if (existing) throw ApiError.conflict('Email already registered');
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existing = await userRepo().findOne({ where: { phone: dto.phone } });
      if (existing) throw ApiError.conflict('Phone number already registered');
    }

    Object.assign(user, dto);
    return userRepo().save(user);
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
      .leftJoinAndSelect('p.owner', 'owner')
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

  async getPropertyById(propertyId: string): Promise<Property> {
    const property = await propertyRepo().findOne({
      where: { id: propertyId },
      relations: ['images', 'owner'],
    });
    if (!property) throw ApiError.notFound('Property not found');
    return property;
  }

  async getAllProperties(query: PaginationQuery & { status?: PropertyStatus }): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.owner', 'owner');

    if ((query as any).status) {
      qb.andWhere('p.status = :status', { status: (query as any).status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  // ─── Helpers ──────────────────────────────────
  private sanitizeAdmin(admin: Admin): Admin {
    const sanitized = { ...admin };
    delete (sanitized as any).password;
    delete (sanitized as any).passwordResetToken;
    delete (sanitized as any).passwordResetExpires;
    return sanitized;
  }
}
