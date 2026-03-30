import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { AdminPermission } from '../../types';
import { CreateAdminDto, UpdateAdminPermissionsDto, UpdateAdminRoleDto, UpdateUserDto, RejectPropertyDto } from './admin.dto';
import { LoginDto, RefreshTokenDto } from '../auth/auth.dto';
import { RejectKycDto } from '../kyc/kyc.dto';
import { KycController } from '../kyc/kyc.controller';
import { DisputeController } from '../disputes/dispute.controller';
import { UpdateDisputeStatusDto } from '../disputes/dispute.dto';
import { AdminRentController } from '../rents/rent.controller';
import { LegalDocumentController } from '../legal-documents/legal-document.controller';
import { uploadMedia, processUpload } from '../../middleware/upload';
import { SystemSettingsController } from '../settings/system-settings.controller';
import { UpdateSystemSettingsDto } from '../settings/system-settings.dto';

const router = Router();
const ctrl = new AdminController();
const kycCtrl = new KycController();
const disputeCtrl = new DisputeController();
const rentCtrl = new AdminRentController();

// ─── Public admin auth routes (no JWT required) ───
router.post('/login', validateBody(LoginDto), asyncHandler(ctrl.login as any));
router.post('/refresh', validateBody(RefreshTokenDto), asyncHandler(ctrl.refreshToken as any));
router.post('/logout', asyncHandler(ctrl.logout as any));

// All remaining admin routes require authentication (permission checked per-route)
router.use(authenticate as any);

// ─── Admin Member Management (requires MANAGE_ADMINS) ───
router.get('/members', requirePermission(AdminPermission.MANAGE_ADMINS) as any, asyncHandler(ctrl.getAdminMembers as any));
router.get('/members/permissions', requirePermission(AdminPermission.MANAGE_ADMINS) as any, asyncHandler(ctrl.listPermissions as any));
router.get('/members/:id', requirePermission(AdminPermission.MANAGE_ADMINS) as any, asyncHandler(ctrl.getAdminById as any));
router.post('/members', requirePermission(AdminPermission.MANAGE_ADMINS) as any, validateBody(CreateAdminDto), asyncHandler(ctrl.createAdmin as any));
router.put('/members/:id/permissions', requirePermission(AdminPermission.MANAGE_ADMINS) as any, validateBody(UpdateAdminPermissionsDto), asyncHandler(ctrl.updatePermissions as any));
router.patch('/members/:id/super-admin', requirePermission(AdminPermission.MANAGE_ADMINS) as any, validateBody(UpdateAdminRoleDto), asyncHandler(ctrl.toggleSuperAdmin as any));
router.delete('/members/:id', requirePermission(AdminPermission.MANAGE_ADMINS) as any, asyncHandler(ctrl.removeAdmin as any));

// ─── Dashboard ──────────────────────────────
router.get('/dashboard', requirePermission(AdminPermission.VIEW_DASHBOARD) as any, asyncHandler(ctrl.dashboard as any));

// ─── User Management ────────────────────────
router.get('/users', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUsers as any));
router.get('/users/:id', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserById as any));
router.put('/users/:id', requirePermission(AdminPermission.VIEW_USERS) as any, validateBody(UpdateUserDto), asyncHandler(ctrl.updateUser as any));
router.patch('/users/:id/toggle-active', requirePermission(AdminPermission.TOGGLE_USER_STATUS) as any, asyncHandler(ctrl.toggleUserActive as any));
router.patch('/users/:id/verify', requirePermission(AdminPermission.VERIFY_USER) as any, asyncHandler(ctrl.verifyUser as any));
router.post('/users/:id/reset-password', requirePermission(AdminPermission.VERIFY_USER) as any, asyncHandler(ctrl.resetUserPassword as any));

// ─── User Activity (sub-resources) ──────────
router.get('/users/:id/properties', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserProperties as any));
router.get('/users/:id/bookings', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserBookings as any));
router.get('/users/:id/invoices', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserInvoices as any));
router.get('/users/:id/payments', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserPayments as any));
router.get('/users/:id/wallet', requirePermission(AdminPermission.VIEW_USERS) as any, asyncHandler(ctrl.getUserWallet as any));

// ─── Invoices ───────────────────────────────
router.get('/invoices', requirePermission(AdminPermission.VIEW_INVOICES) as any, asyncHandler(ctrl.getAllInvoices as any));
router.patch('/invoices/:id/terminate', requirePermission(AdminPermission.TERMINATE_RENTAL) as any, asyncHandler(ctrl.terminateRental as any));

// ─── Rents ─────────────────────────────────
router.get('/rents', requirePermission(AdminPermission.VIEW_INVOICES) as any, asyncHandler(rentCtrl.getAllRents as any));
router.patch('/rents/:id/terminate', requirePermission(AdminPermission.TERMINATE_RENTAL) as any, asyncHandler(rentCtrl.terminateRent as any));

// ─── Property Moderation ────────────────────
router.get('/properties', requirePermission(AdminPermission.VIEW_PROPERTIES) as any, asyncHandler(ctrl.getAllProperties as any));
router.get('/properties/pending', requirePermission(AdminPermission.VIEW_PROPERTIES) as any, asyncHandler(ctrl.getPendingProperties as any));
router.get('/properties/:id', requirePermission(AdminPermission.VIEW_PROPERTIES) as any, asyncHandler(ctrl.getPropertyById as any));
router.patch('/properties/:id/approve', requirePermission(AdminPermission.APPROVE_PROPERTY) as any, asyncHandler(ctrl.approveProperty as any));
router.patch('/properties/:id/reject', requirePermission(AdminPermission.REJECT_PROPERTY) as any, validateBody(RejectPropertyDto), asyncHandler(ctrl.rejectProperty as any));
router.patch('/properties/:id/suspend', requirePermission(AdminPermission.SUSPEND_PROPERTY) as any, validateBody(RejectPropertyDto), asyncHandler(ctrl.suspendProperty as any));

// ─── KYC Management ────────────────────────
router.get('/kyc', requirePermission(AdminPermission.MANAGE_KYC) as any, asyncHandler(kycCtrl.getAllSubmissions as any));
router.get('/kyc/:id', requirePermission(AdminPermission.MANAGE_KYC) as any, asyncHandler(kycCtrl.getSubmissionById as any));
router.patch('/kyc/:id/approve', requirePermission(AdminPermission.MANAGE_KYC) as any, asyncHandler(kycCtrl.approve as any));
router.patch('/kyc/:id/reject', requirePermission(AdminPermission.MANAGE_KYC) as any, validateBody(RejectKycDto), asyncHandler(kycCtrl.reject as any));

// ─── Payments ───────────────────────────────
router.get('/payments', requirePermission(AdminPermission.VIEW_PAYMENTS) as any, asyncHandler(ctrl.getAllPayments as any));
router.get('/payments/stats', requirePermission(AdminPermission.VIEW_PAYMENTS) as any, asyncHandler(ctrl.getPaymentStats as any));

// ─── Wallet Management ─────────────────────
import { RejectWithdrawalDto } from '../wallet/wallet.dto';

router.get('/wallets', requirePermission(AdminPermission.MANAGE_WALLETS) as any, asyncHandler(ctrl.getAllWallets as any));
router.get('/wallets/:id/transactions', requirePermission(AdminPermission.MANAGE_WALLETS) as any, asyncHandler(ctrl.getWalletTransactions as any));
router.get('/withdrawals', requirePermission(AdminPermission.MANAGE_WALLETS) as any, asyncHandler(ctrl.getAllWithdrawals as any));
router.patch('/withdrawals/:id/approve', requirePermission(AdminPermission.MANAGE_WALLETS) as any, asyncHandler(ctrl.approveWithdrawal as any));
router.patch('/withdrawals/:id/reject', requirePermission(AdminPermission.MANAGE_WALLETS) as any, validateBody(RejectWithdrawalDto), asyncHandler(ctrl.rejectWithdrawal as any));

// ─── Disputes Management ─────────────────
router.get('/disputes', requirePermission(AdminPermission.MANAGE_DISPUTES) as any, asyncHandler(disputeCtrl.list as any));
router.get('/disputes/:id', requirePermission(AdminPermission.MANAGE_DISPUTES) as any, asyncHandler(disputeCtrl.getById as any));
router.patch('/disputes/:id/status', requirePermission(AdminPermission.MANAGE_DISPUTES) as any, validateBody(UpdateDisputeStatusDto), asyncHandler(disputeCtrl.updateStatus as any));

// ─── Legal Documents Management ─────────
const legalDocCtrl = new LegalDocumentController();

router.get('/legal-documents/templates', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.listTemplates as any));
router.post('/legal-documents/templates', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, uploadMedia.single('file'), processUpload as any, asyncHandler(legalDocCtrl.createTemplate as any));
router.delete('/legal-documents/templates/:id', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.deleteTemplate as any));

router.get('/legal-documents/rents', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.getActiveRents as any));

router.get('/legal-documents', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.listDocuments as any));
router.post('/legal-documents', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, uploadMedia.single('file'), processUpload as any, asyncHandler(legalDocCtrl.assignDocument as any));
router.get('/legal-documents/:id', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.getDocumentById as any));
router.delete('/legal-documents/:id', requirePermission(AdminPermission.MANAGE_LEGAL_DOCUMENTS) as any, asyncHandler(legalDocCtrl.deleteDocument as any));

// ─── System Settings ────────────────────
const settingsCtrl = new SystemSettingsController();

router.get('/settings', requirePermission(AdminPermission.MANAGE_SETTINGS) as any, asyncHandler(settingsCtrl.getSettings as any));
router.put('/settings', requirePermission(AdminPermission.MANAGE_SETTINGS) as any, validateBody(UpdateSystemSettingsDto), asyncHandler(settingsCtrl.updateSettings as any));

export default router;
