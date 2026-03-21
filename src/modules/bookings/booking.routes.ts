import { Router } from 'express';
import { BookingController } from './booking.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { resolveOrganisation, requireOrgPermission } from '../../middleware/organisation.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { CreateBookingDto, RespondBookingDto, CompleteBookingDto, AssignInspectionDateDto, BookingFilterDto } from './booking.dto';
import { OrgPermission } from '../../types';

const router = Router();
const ctrl = new BookingController();

router.use(authenticate as any);

// Any authenticated user can create/view/cancel bookings
router.post('/', validateBody(CreateBookingDto), asyncHandler(ctrl.create as any));
router.get('/tenant', validateQuery(BookingFilterDto), asyncHandler(ctrl.getTenantBookings as any));
router.patch('/:id/cancel', asyncHandler(ctrl.cancel as any));
router.delete('/:id', asyncHandler(ctrl.delete as any));

// Property Owner
router.get('/owner', requirePropertyOwner() as any, resolveOrganisation() as any, asyncHandler(ctrl.getOwnerBookings as any));
router.patch('/:id/respond', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_BOOKINGS) as any, validateBody(RespondBookingDto), asyncHandler(ctrl.respond as any));
router.patch('/:id/inspection-date', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_BOOKINGS) as any, validateBody(AssignInspectionDateDto), asyncHandler(ctrl.assignInspectionDate as any));
router.patch('/:id/complete', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_BOOKINGS) as any, validateBody(CompleteBookingDto), asyncHandler(ctrl.complete as any));

// Shared
router.get('/:id', asyncHandler(ctrl.findById as any));

export default router;
