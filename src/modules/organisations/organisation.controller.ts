import { Response } from 'express';
import { OrganisationService } from './organisation.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/response';
import { AuthenticatedRequest } from '../../types';

const orgService = new OrganisationService();

export class OrganisationController {
  // ─── Organisation CRUD ──────────────────────────────

  async create(req: AuthenticatedRequest, res: Response) {
    const org = await orgService.create(req.user.sub, req.body);
    return sendCreated(res, org, 'Organisation created');
  }

  async findAll(req: AuthenticatedRequest, res: Response) {
    const orgs = await orgService.findAll(req.user.sub);
    return sendSuccess(res, orgs);
  }

  async findById(req: AuthenticatedRequest, res: Response) {
    const org = await orgService.findById(req.params.id, req.user.sub);
    return sendSuccess(res, org);
  }

  async update(req: AuthenticatedRequest, res: Response) {
    const org = await orgService.update(req.params.id, req.user.sub, req.body);
    return sendSuccess(res, org, 'Organisation updated');
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response) {
    const file = req.file as Express.Multer.File;
    if (!file) {
      return sendSuccess(res, null, 'No file uploaded');
    }
    const logoUrl = `/uploads/${file.filename}`;
    const org = await orgService.updateLogo(req.params.id, req.user.sub, logoUrl);
    return sendSuccess(res, org, 'Logo updated');
  }

  async remove(req: AuthenticatedRequest, res: Response) {
    await orgService.remove(req.params.id, req.user.sub);
    return sendNoContent(res);
  }

  // ─── Invites (org-scoped) ───────────────────────────

  async invite(req: AuthenticatedRequest, res: Response) {
    const invite = await orgService.invite(req.params.id, req.user.sub, req.body);
    return sendCreated(res, invite, 'Invitation sent');
  }

  async getInvites(req: AuthenticatedRequest, res: Response) {
    const invites = await orgService.getInvites(req.params.id, req.user.sub);
    return sendSuccess(res, invites);
  }

  async revokeInvite(req: AuthenticatedRequest, res: Response) {
    await orgService.revokeInvite(req.params.id, req.params.inviteId, req.user.sub);
    return sendNoContent(res);
  }

  // ─── Members ────────────────────────────────────────

  async getMembers(req: AuthenticatedRequest, res: Response) {
    const members = await orgService.getMembers(req.params.id, req.user.sub);
    return sendSuccess(res, members);
  }

  async updateMember(req: AuthenticatedRequest, res: Response) {
    const member = await orgService.updateMemberPermissions(req.params.id, req.params.memberId, req.user.sub, req.body);
    return sendSuccess(res, member, 'Member permissions updated');
  }

  async removeMember(req: AuthenticatedRequest, res: Response) {
    await orgService.removeMember(req.params.id, req.params.memberId, req.user.sub);
    return sendNoContent(res);
  }

  // ─── My Invites (user-scoped) ────────────────────────

  async getMyInvites(req: AuthenticatedRequest, res: Response) {
    const invites = await orgService.getMyInvites(req.user.email);
    return sendSuccess(res, invites);
  }

  async acceptInvite(req: AuthenticatedRequest, res: Response) {
    const member = await orgService.acceptInvite(req.params.inviteId, req.user.sub, req.user.email);
    return sendSuccess(res, member, 'Invitation accepted');
  }

  async declineInvite(req: AuthenticatedRequest, res: Response) {
    await orgService.declineInvite(req.params.inviteId, req.user.email);
    return sendSuccess(res, null, 'Invitation declined');
  }
}
