import { Request } from 'express';

// ─── Enums ───────────────────────────────────────────────
export enum UserRole {
  TENANT = 'tenant',
  PROPERTY_OWNER = 'property_owner',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export enum PropertyStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  ACTIVE = 'active',
  RENTED = 'rented',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export enum PropertyType {
  APARTMENT = 'apartment',
  HOUSE = 'house',
  DUPLEX = 'duplex',
  FLAT = 'flat',
  SELF_CONTAIN = 'self_contain',
  ROOM = 'room',
  SHOP = 'shop',
  OFFICE = 'office',
  LAND = 'land',
}

export enum BookingStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AgreementStatus {
  DRAFT = 'draft',
  PENDING_TENANT = 'pending_tenant',
  PENDING_OWNER = 'pending_owner',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
}

export enum PaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentType {
  RENT = 'rent',
  DEPOSIT = 'deposit',
  COMMISSION = 'commission',
  AGREEMENT_FEE = 'agreement_fee',
}

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

export enum KycDocumentType {
  NATIONAL_ID = 'national_id',
  INTERNATIONAL_PASSPORT = 'international_passport',
  DRIVERS_LICENSE = 'drivers_license',
  VOTERS_CARD = 'voters_card',
}

export enum KycStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

// ─── Admin Permissions ──────────────────────────────────
export enum AdminPermission {
  // Admin management
  MANAGE_ADMINS = 'manage_admins',

  // User management
  VIEW_USERS = 'view_users',
  TOGGLE_USER_STATUS = 'toggle_user_status',
  VERIFY_USER = 'verify_user',

  // Property moderation
  VIEW_PROPERTIES = 'view_properties',
  APPROVE_PROPERTY = 'approve_property',
  REJECT_PROPERTY = 'reject_property',
  SUSPEND_PROPERTY = 'suspend_property',

  // Payments
  VIEW_PAYMENTS = 'view_payments',
  PROCESS_REFUND = 'process_refund',

  // Agreements
  VIEW_AGREEMENTS = 'view_agreements',

  // Dashboard / analytics
  VIEW_DASHBOARD = 'view_dashboard',

  // Disputes
  MANAGE_DISPUTES = 'manage_disputes',

  // KYC
  MANAGE_KYC = 'manage_kyc',
}

export const ALL_ADMIN_PERMISSIONS = Object.values(AdminPermission);

// ─── Auth ────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // user id
  email: string;
  role: UserRole;
  permissions?: AdminPermission[];
  isSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  params: Record<string, string>;
}

// ─── Pagination ──────────────────────────────────────────
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── API Response ────────────────────────────────────────
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}
