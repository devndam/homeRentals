import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { AdminPermission } from '../../types';
import { CreateAdminDto, UpdateAdminPermissionsDto, UpdateAdminRoleDto, RejectPropertyDto } from './admin.dto';

const router = Router();
const ctrl = new AdminController();

// All admin routes require authentication (permission checked per-route)
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
router.patch('/users/:id/toggle-active', requirePermission(AdminPermission.TOGGLE_USER_STATUS) as any, asyncHandler(ctrl.toggleUserActive as any));
router.patch('/users/:id/verify', requirePermission(AdminPermission.VERIFY_USER) as any, asyncHandler(ctrl.verifyUser as any));

// ─── Property Moderation ────────────────────
router.get('/properties', requirePermission(AdminPermission.VIEW_PROPERTIES) as any, asyncHandler(ctrl.getAllProperties as any));
router.get('/properties/pending', requirePermission(AdminPermission.VIEW_PROPERTIES) as any, asyncHandler(ctrl.getPendingProperties as any));
router.patch('/properties/:id/approve', requirePermission(AdminPermission.APPROVE_PROPERTY) as any, asyncHandler(ctrl.approveProperty as any));
router.patch('/properties/:id/reject', requirePermission(AdminPermission.REJECT_PROPERTY) as any, validateBody(RejectPropertyDto), asyncHandler(ctrl.rejectProperty as any));
router.patch('/properties/:id/suspend', requirePermission(AdminPermission.SUSPEND_PROPERTY) as any, validateBody(RejectPropertyDto), asyncHandler(ctrl.suspendProperty as any));

// ─── Payments ───────────────────────────────
router.get('/payments', requirePermission(AdminPermission.VIEW_PAYMENTS) as any, asyncHandler(ctrl.getAllPayments as any));

export default router;
