import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { Admin } from './admin.entity';
import { User } from '../users/user.entity';
import { Property } from '../properties/property.entity';
import { Payment } from '../payments/payment.entity';
import { Booking } from '../bookings/booking.entity';
import { Invoice } from '../invoices/invoice.entity';
import { ApiError } from '../../utils/api-error';
import {
  AdminPermission, ALL_ADMIN_PERMISSIONS,
  PaginatedResponse, PaginationQuery, PropertyStatus, PaymentStatus,
  BookingStatus, InvoiceStatus,
} from '../../types';
import { CreateAdminDto, UpdateAdminPermissionsDto, UpdateUserDto } from './admin.dto';
import { paginate } from '../../utils/pagination';
import { EmailService } from '../../utils/email.service';
import crypto from 'crypto';

const emailService = new EmailService();

const adminRepo = () => AppDataSource.getRepository(Admin);
const userRepo = () => AppDataSource.getRepository(User);
const propertyRepo = () => AppDataSource.getRepository(Property);
const paymentRepo = () => AppDataSource.getRepository(Payment);
const bookingRepo = () => AppDataSource.getRepository(Booking);
const invoiceRepo = () => AppDataSource.getRepository(Invoice);

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
      [AdminPermission.EDIT_PROPERTY]: 'Edit property listings',
      [AdminPermission.APPROVE_PROPERTY]: 'Approve property listings',
      [AdminPermission.REJECT_PROPERTY]: 'Reject property listings',
      [AdminPermission.SUSPEND_PROPERTY]: 'Suspend property listings',
      [AdminPermission.VIEW_PAYMENTS]: 'View all payment transactions',
      [AdminPermission.PROCESS_REFUND]: 'Process payment refunds',
      [AdminPermission.VIEW_INVOICES]: 'View all rental invoices',
      [AdminPermission.TERMINATE_RENTAL]: 'Terminate active rental agreements',
      [AdminPermission.VIEW_DASHBOARD]: 'View dashboard analytics',
      [AdminPermission.MANAGE_DISPUTES]: 'Manage and resolve disputes',
      [AdminPermission.MANAGE_KYC]: 'Review, approve, and reject KYC submissions',
      [AdminPermission.MANAGE_WALLETS]: 'View wallets, approve or reject withdrawal requests',
      [AdminPermission.MANAGE_LEGAL_DOCUMENTS]: 'Manage legal document templates',
      [AdminPermission.MANAGE_SETTINGS]: 'Update system settings',
      [AdminPermission.MANAGE_BLOG]: 'Create, edit, and manage blog posts, categories, and tags',
      [AdminPermission.MANAGE_LOCATIONS]: 'Manage service locations where the platform operates',
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
    // ── Summary counts ──
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
    const totalInvoices = await invoiceRepo().count();

    const revenueResult = await paymentRepo()
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalRevenue')
      .addSelect('SUM(p.commission)', 'totalCommission')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne();

    // ── Activity trends (last 90 days, frontend slices by period) ──
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const [listingTrends, bookingTrends, paymentTrends] = await Promise.all([
      propertyRepo().createQueryBuilder('p')
        .select("TO_CHAR(p.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('p.createdAt >= :start', { start: startDate })
        .groupBy("TO_CHAR(p.createdAt, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany(),

      bookingRepo().createQueryBuilder('b')
        .select("TO_CHAR(b.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('b.createdAt >= :start', { start: startDate })
        .groupBy("TO_CHAR(b.createdAt, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany(),

      paymentRepo().createQueryBuilder('pay')
        .select("TO_CHAR(pay.createdAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(*)::int', 'count')
        .where('pay.createdAt >= :start', { start: startDate })
        .andWhere('pay.status = :status', { status: PaymentStatus.SUCCESS })
        .groupBy("TO_CHAR(pay.createdAt, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany(),
    ]);

    // ── Top states by property count (rentedCount = active rents in that state) ──
    const topStates = await propertyRepo().createQueryBuilder('p')
      .select('p.state', 'state')
      .addSelect('COUNT(DISTINCT p.id)::int', 'listingCount')
      .addSelect('COUNT(DISTINCT r.id)::int', 'rentedCount')
      .leftJoin('rents', 'r', 'r.propertyId = p.id AND r.status IN (:...rentStatuses)', { rentStatuses: ['active', 'due', 'overdue'] })
      .groupBy('p.state')
      .orderBy('COUNT(DISTINCT p.id)', 'DESC')
      .limit(6)
      .getRawMany();

    // ── Recent activity (bookings + new listings) ──
    const [recentBookings, recentListings] = await Promise.all([
      bookingRepo().createQueryBuilder('b')
        .leftJoin('b.tenant', 'tenant')
        .addSelect(['tenant.firstName', 'tenant.lastName'])
        .leftJoin('b.property', 'property')
        .addSelect(['property.title', 'property.city', 'property.state'])
        .orderBy('b.createdAt', 'DESC')
        .take(5)
        .getMany(),

      propertyRepo().createQueryBuilder('p')
        .leftJoin('p.owner', 'owner')
        .addSelect(['owner.firstName', 'owner.lastName'])
        .orderBy('p.createdAt', 'DESC')
        .take(5)
        .getMany(),
    ]);

    const recentActivity = [
      ...recentBookings.map(b => ({
        id: b.id,
        userName: `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim(),
        userRole: 'Tenant',
        propertyTitle: b.property?.title || '-',
        propertyLocation: `${b.property?.city || ''}, ${b.property?.state || ''}`,
        action: 'Inspection Request',
        date: b.createdAt,
        status: b.status,
      })),
      ...recentListings.map(p => ({
        id: p.id,
        userName: `${p.owner?.firstName || ''} ${p.owner?.lastName || ''}`.trim(),
        userRole: 'Landlord',
        propertyTitle: p.title,
        propertyLocation: `${p.city || ''}, ${p.state || ''}`,
        action: 'Listed Property',
        date: p.createdAt,
        status: p.status === PropertyStatus.ACTIVE ? 'active' : 'pending',
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, 10);

    return {
      users: { total: totalUsers, propertyOwners: totalOwners, admins: totalAdmins },
      properties: { total: totalProperties, active: activeProperties, pendingReview: pendingProperties },
      bookings: totalBookings,
      invoices: totalInvoices,
      revenue: {
        total: parseFloat(revenueResult?.totalRevenue || '0'),
        commission: parseFloat(revenueResult?.totalCommission || '0'),
      },
      trends: {
        listings: listingTrends,
        bookings: bookingTrends,
        payments: paymentTrends,
      },
      topStates,
      recentActivity,
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

  async resetUserPassword(userId: string): Promise<void> {
    const user = await userRepo().findOne({ where: { id: userId } });
    if (!user) throw ApiError.notFound('User not found');

    const newPassword = crypto.randomBytes(6).toString('base64url'); // ~8 chars
    user.password = await bcrypt.hash(newPassword, 12);
    await userRepo().save(user);

    await emailService.sendAdminPasswordReset(user.email, user.firstName, newPassword);
  }

  // ═══════════════════════════════════════════════
  // USER SUB-RESOURCES (for admin user detail page)
  // ═══════════════════════════════════════════════

  async getUserProperties(userId: string, query: PaginationQuery & { status?: PropertyStatus }): Promise<PaginatedResponse<Property>> {
    const qb = propertyRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img')
      .where('p.ownerId = :userId', { userId });

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getUserBookings(userId: string, query: PaginationQuery & { status?: BookingStatus }): Promise<PaginatedResponse<Booking>> {
    const qb = bookingRepo()
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.property', 'p')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('b.tenant', 'tenant')
      .leftJoinAndSelect('b.owner', 'owner')
      .where('(b.tenantId = :userId OR b.ownerId = :userId)', { userId });

    if (query.status) {
      qb.andWhere('b.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getAllInvoices(query: PaginationQuery & { status?: InvoiceStatus; search?: string }): Promise<PaginatedResponse<Invoice>> {
    const qb = invoiceRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.property', 'p')
      .leftJoinAndSelect('p.images', 'pimg')
      .leftJoinAndSelect('a.tenant', 'tenant')
      .leftJoinAndSelect('a.owner', 'owner');

    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('(p.title ILIKE :search OR p.address ILIKE :search OR tenant."firstName" ILIKE :search OR tenant."lastName" ILIKE :search OR owner."firstName" ILIKE :search OR owner."lastName" ILIKE :search)', { search: `%${query.search}%` });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getUserInvoices(userId: string, query: PaginationQuery & { status?: InvoiceStatus }): Promise<PaginatedResponse<Invoice>> {
    const qb = invoiceRepo()
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.property', 'p')
      .leftJoinAndSelect('a.tenant', 'tenant')
      .leftJoinAndSelect('a.owner', 'owner')
      .where('(a.tenantId = :userId OR a.ownerId = :userId)', { userId });

    if (query.status) {
      qb.andWhere('a.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getUserPayments(userId: string, query: PaginationQuery & { status?: PaymentStatus }): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.property', 'prop')
      .where('p.userId = :userId', { userId });

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  // ═══════════════════════════════════════════════
  // PROPERTY MODERATION
  // ═══════════════════════════════════════════════

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

  async getAllPayments(query: PaginationQuery & { status?: PaymentStatus; search?: string }): Promise<PaginatedResponse<Payment>> {
    const qb = paymentRepo()
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'user')
      .leftJoinAndSelect('p.property', 'prop');

    if (query.status) qb.andWhere('p.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere(
        '(p.reference ILIKE :s OR p.paystackReference ILIKE :s OR user.firstName ILIKE :s OR user.lastName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    return paginate(qb, { ...query, sort: query.sort || 'createdAt', order: query.order || 'DESC' });
  }

  async getPaymentStats() {
    const totals = await paymentRepo()
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalEarnings')
      .addSelect('SUM(p.commission)', 'totalCommission')
      .addSelect('SUM(p.ownerAmount)', 'netReceived')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .getRawOne();

    // Monthly income trend (last 12 months)
    const incomeTrend = await paymentRepo()
      .createQueryBuilder('p')
      .select("TO_CHAR(p.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(p.amount)', 'totalEarnings')
      .addSelect('SUM(p.ownerAmount)', 'netReceived')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere("p.createdAt >= NOW() - INTERVAL '12 months'")
      .groupBy("TO_CHAR(p.createdAt, 'YYYY-MM')")
      .orderBy('month', 'ASC')
      .getRawMany();

    // Top earning landlords
    const topLandlords = await paymentRepo()
      .createQueryBuilder('p')
      .leftJoin('p.property', 'prop')
      .leftJoin('prop.owner', 'owner')
      .select('owner.id', 'id')
      .addSelect("CONCAT(owner.firstName, ' ', owner.lastName)", 'name')
      .addSelect('COUNT(DISTINCT prop.id)::int', 'propertyCount')
      .addSelect('SUM(p.ownerAmount)', 'totalEarned')
      .where('p.status = :status', { status: PaymentStatus.SUCCESS })
      .andWhere('owner.id IS NOT NULL')
      .groupBy('owner.id')
      .addGroupBy('owner.firstName')
      .addGroupBy('owner.lastName')
      .orderBy('SUM(p.ownerAmount)', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalEarnings: parseFloat(totals?.totalEarnings || '0'),
      totalCommission: parseFloat(totals?.totalCommission || '0'),
      netReceived: parseFloat(totals?.netReceived || '0'),
      incomeTrend,
      topLandlords,
    };
  }

  async getPropertyById(propertyId: string): Promise<Property> {
    const property = await propertyRepo().findOne({
      where: { id: propertyId },
      relations: ['images', 'owner'],
    });
    if (!property) throw ApiError.notFound('Property not found');
    return property;
  }

  async updateProperty(propertyId: string, dto: Record<string, any>): Promise<Property> {
    const property = await propertyRepo().findOne({
      where: { id: propertyId },
      relations: ['images', 'owner'],
    });
    if (!property) throw ApiError.notFound('Property not found');

    Object.assign(property, dto);
    return propertyRepo().save(property);
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
