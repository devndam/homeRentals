import { Router } from 'express';
import { BookingController } from './booking.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto } from './booking.dto';
import { UserRole } from '../../types';

const router = Router();
const ctrl = new BookingController();

router.use(authenticate as any);

// Tenant
router.post('/', authorize(UserRole.TENANT) as any, validateBody(CreateBookingDto), asyncHandler(ctrl.create as any));
router.get('/tenant', authorize(UserRole.TENANT) as any, asyncHandler(ctrl.getTenantBookings as any));
router.patch('/:id/cancel', authorize(UserRole.TENANT) as any, asyncHandler(ctrl.cancel as any));

// Landlord
router.get('/landlord', authorize(UserRole.LANDLORD) as any, asyncHandler(ctrl.getLandlordBookings as any));
router.patch('/:id/respond', authorize(UserRole.LANDLORD) as any, validateBody(RespondBookingDto), asyncHandler(ctrl.respond as any));
router.patch('/:id/complete', authorize(UserRole.LANDLORD) as any, validateBody(CompleteBookingDto), asyncHandler(ctrl.complete as any));

// Shared
router.get('/:id', asyncHandler(ctrl.findById as any));

export default router;
