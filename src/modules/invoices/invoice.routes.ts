import { Router } from 'express';
import { InvoiceController } from './invoice.controller';
import { RentReminderController } from './rent-reminder.controller';
import { authenticate, requirePropertyOwner, requirePermission } from '../../middleware/auth.middleware';
import { resolveOrganisation, requireOrgPermission } from '../../middleware/organisation.middleware';
import { validateBody, validateQuery } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { RequestInvoiceDto, CreateInvoiceDto, SignInvoiceDto, InvoiceFilterDto } from './invoice.dto';
import { OrgPermission } from '../../types';

const router = Router();
const ctrl = new InvoiceController();
const reminderCtrl = new RentReminderController();

router.use(authenticate as any);

// List & detail
router.get('/', validateQuery(InvoiceFilterDto), asyncHandler(ctrl.getMyInvoices as any));
router.get('/:id', asyncHandler(ctrl.findById as any));

// Tenant requests an invoice
router.post('/request', validateBody(RequestInvoiceDto), asyncHandler(ctrl.requestInvoice as any));

// Property owner creates & sends invoices
router.post('/', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_INVOICES) as any, validateBody(CreateInvoiceDto), asyncHandler(ctrl.create as any));
router.patch('/:id/send', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_INVOICES) as any, asyncHandler(ctrl.sendInvoice as any));
router.patch('/:id/terminate', requirePropertyOwner() as any, resolveOrganisation() as any, requireOrgPermission(OrgPermission.MANAGE_RENTS) as any, asyncHandler(ctrl.terminate as any));

// Tenant signs the legal agreement after payment
router.patch('/:id/sign', validateBody(SignInvoiceDto), asyncHandler(ctrl.signAsTenant as any));

// Either party can cancel before payment
router.patch('/:id/cancel', asyncHandler(ctrl.cancel as any));

// Admin-only: trigger rent reminders
router.post('/reminders/process', requirePermission() as any, asyncHandler(reminderCtrl.processReminders as any));

export default router;
