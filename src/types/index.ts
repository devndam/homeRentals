import { Request } from 'express';

// ─── Enums ───────────────────────────────────────────────
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
  INSPECTION_SCHEDULED = 'inspection_scheduled',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RENTED = 'rented',
}

export enum InvoiceStatus {
  REQUESTED = 'requested',
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  AGREEMENT_SENT = 'agreement_sent',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  TERMINATED = 'terminated',
}

export enum RentStatus {
  ACTIVE = 'active',
  DUE = 'due',
  OVERDUE = 'overdue',
  TERMINATED = 'terminated',
}

export enum InvoiceType {
  INITIAL = 'initial',
  RENEWAL = 'renewal',
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
  INVOICE_FEE = 'invoice_fee',
  INITIAL = 'initial',
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

export enum WithdrawalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum DisputeType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  REFUND = 'refund',
}

export enum DisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  RESOLVED = 'resolved',
}

export enum LegalDocumentStatus {
  PENDING = 'pending',
  ACKNOWLEDGED = 'acknowledged',
}

export enum BlogPostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum NotificationType {
  BOOKING = 'booking',
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  RENT = 'rent',
  ORGANISATION = 'organisation',
  LEGAL_DOCUMENT = 'legal_document',
  SYSTEM = 'system',
}

// ─── Organisation Permissions ───────────────────────────
export enum OrgPermission {
  MANAGE_PROPERTIES = 'manage_properties',
  MANAGE_BOOKINGS = 'manage_bookings',
  MANAGE_INVOICES = 'manage_invoices',
  MANAGE_RENTS = 'manage_rents',
  MANAGE_AGREEMENTS = 'manage_agreements',
  VIEW_PAYMENTS = 'view_payments',
  VIEW_WALLET = 'view_wallet',
  MANAGE_STAFF = 'manage_staff',
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

  // Invoices
  VIEW_INVOICES = 'view_invoices',
  TERMINATE_RENTAL = 'terminate_rental',

  // Dashboard / analytics
  VIEW_DASHBOARD = 'view_dashboard',

  // Disputes
  MANAGE_DISPUTES = 'manage_disputes',

  // KYC
  MANAGE_KYC = 'manage_kyc',

  // Wallets
  MANAGE_WALLETS = 'manage_wallets',

  // Legal Documents
  MANAGE_LEGAL_DOCUMENTS = 'manage_legal_documents',

  // System Settings
  MANAGE_SETTINGS = 'manage_settings',

  // Blog
  MANAGE_BLOG = 'manage_blog',

  // Service Locations
  MANAGE_LOCATIONS = 'manage_locations',
}

export const ALL_ADMIN_PERMISSIONS = Object.values(AdminPermission);

// ─── Auth ────────────────────────────────────────────────
interface BaseJwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface UserJwtPayload extends BaseJwtPayload {
  type: 'user';
  isPropertyOwner: boolean;
}

export interface AdminJwtPayload extends BaseJwtPayload {
  type: 'admin';
  isSuperAdmin: boolean;
  permissions: AdminPermission[];
}

export type JwtPayload = UserJwtPayload | AdminJwtPayload;

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  params: Record<string, string>;
  effectiveOwnerId?: string;
  organisation?: any;
  orgMembership?: any;
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
