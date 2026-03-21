import { Router } from 'express';
import { OrganisationController } from './organisation.controller';
import { authenticate, requirePropertyOwner } from '../../middleware/auth.middleware';
import { validateBody } from '../../middleware/validate';
import { asyncHandler } from '../../utils/async-handler';
import { uploadMedia } from '../../middleware/upload';
import { CreateOrganisationDto, UpdateOrganisationDto, InviteStaffDto, UpdateMemberPermissionsDto } from './organisation.dto';

const router = Router();
const ctrl = new OrganisationController();

router.use(authenticate as any);

// ─── My invites (user-scoped, must come before /:id routes) ─────
router.get('/my-invites', asyncHandler(ctrl.getMyInvites as any));
router.post('/invites/:inviteId/accept', asyncHandler(ctrl.acceptInvite as any));
router.post('/invites/:inviteId/decline', asyncHandler(ctrl.declineInvite as any));

// ─── Organisation CRUD ──────────────────────────────────────────
router.post('/', requirePropertyOwner() as any, validateBody(CreateOrganisationDto), asyncHandler(ctrl.create as any));
router.get('/', asyncHandler(ctrl.findAll as any));
router.get('/:id', asyncHandler(ctrl.findById as any));
router.patch('/:id', requirePropertyOwner() as any, validateBody(UpdateOrganisationDto), asyncHandler(ctrl.update as any));
router.post('/:id/logo', requirePropertyOwner() as any, uploadMedia.single('logo'), asyncHandler(ctrl.uploadLogo as any));
router.delete('/:id', requirePropertyOwner() as any, asyncHandler(ctrl.remove as any));

// ─── Invites (org-scoped — access checked in service) ───────────
router.post('/:id/invites', validateBody(InviteStaffDto), asyncHandler(ctrl.invite as any));
router.get('/:id/invites', asyncHandler(ctrl.getInvites as any));
router.delete('/:id/invites/:inviteId', asyncHandler(ctrl.revokeInvite as any));

// ─── Members (access checked in service) ────────────────────────
router.get('/:id/members', asyncHandler(ctrl.getMembers as any));
router.patch('/:id/members/:memberId', validateBody(UpdateMemberPermissionsDto), asyncHandler(ctrl.updateMember as any));
router.delete('/:id/members/:memberId', asyncHandler(ctrl.removeMember as any));

export default router;
