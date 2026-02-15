import { Router } from 'express';
import { BookingController } from './booking.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto, AssignInspectionDateDto } from './booking.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new BookingController();

router.use(authenticate as any);

// Tenant
router.post('/', authorize(UserRole.TENANT) as any, validateBody(CreateBookingDto), asyncHandler(ctrl.create as any));
router.get('/tenant', authorize(UserRole.TENANT) as any, asyncHandler(ctrl.getTenantBookings as any));
router.patch('/:id/cancel', authorize(UserRole.TENANT) as any, asyncHandler(ctrl.cancel as any));

// Property Owner
router.get('/owner', authorize(UserRole.PROPERTY_OWNER) as any, asyncHandler(ctrl.getOwnerBookings as any));
router.patch('/:id/respond', authorize(UserRole.PROPERTY_OWNER, UserRole.AGENT) as any, validateBody(RespondBookingDto), asyncHandler(ctrl.respond as any));
router.patch('/:id/inspection-date', authorize(UserRole.PROPERTY_OWNER, UserRole.AGENT) as any, validateBody(AssignInspectionDateDto), asyncHandler(ctrl.assignInspectionDate as any));
router.patch('/:id/complete', authorize(UserRole.PROPERTY_OWNER, UserRole.AGENT) as any, validateBody(CompleteBookingDto), asyncHandler(ctrl.complete as any));

// Agent
router.get('/agent', authorize(UserRole.AGENT) as any, asyncHandler(ctrl.getAgentBookings as any));

// Shared
router.get('/:id', asyncHandler(ctrl.findById as any));

export default router;