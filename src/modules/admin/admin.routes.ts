import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new AdminController();

// All admin routes require authentication + admin role
router.use(authenticate as any);
router.use(authorize(UserRole.ADMIN) as any);

// Dashboard
router.get('/dashboard', asyncHandler(ctrl.dashboard as any));

// Users
router.get('/users', asyncHandler(ctrl.getUsers as any));
router.patch('/users/:id/toggle-active', asyncHandler(ctrl.toggleUserActive as any));
router.patch('/users/:id/verify', asyncHandler(ctrl.verifyUser as any));

// Properties
router.get('/properties', asyncHandler(ctrl.getAllProperties as any));
router.get('/properties/pending', asyncHandler(ctrl.getPendingProperties as any));
router.patch('/properties/:id/approve', asyncHandler(ctrl.approveProperty as any));
router.patch('/properties/:id/reject', asyncHandler(ctrl.rejectProperty as any));
router.patch('/properties/:id/suspend', asyncHandler(ctrl.suspendProperty as any));

// Payments
router.get('/payments', asyncHandler(ctrl.getAllPayments as any));

export default router;
