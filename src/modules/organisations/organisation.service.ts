import { AppDataSource } from '../../config/data-source';
import { ApiError } from '../../utils/api-error';
import { EmailService } from '../../utils/email.service';
import { NotificationType, OrgPermission } from '../../types';
import { NotificationService } from '../notifications/notification.service';
import { Organisation } from './organisation.entity';
import { OrganisationMember } from './organisation-member.entity';
import { OrganisationInvite } from './organisation-invite.entity';
import { User } from '../users/user.entity';
import { CreateOrganisationDto, UpdateOrganisationDto, InviteStaffDto, UpdateMemberPermissionsDto } from './organisation.dto';

const orgRepo = () => AppDataSource.getRepository(Organisation);
const memberRepo = () => AppDataSource.getRepository(OrganisationMember);
const inviteRepo = () => AppDataSource.getRepository(OrganisationInvite);
const userRepo = () => AppDataSource.getRepository(User);

const notificationService = new NotificationService();

export class OrganisationService {
  private emailService = new EmailService();

  // ─── Organisation CRUD ──────────────────────────────

  async create(userId: string, dto: CreateOrganisationDto): Promise<Organisation> {
    const org = orgRepo().create({
      name: dto.name,
      ownerId: userId,
    });
    return orgRepo().save(org);
  }

  async findAll(userId: string): Promise<Organisation[]> {
    // Orgs I own
    const owned = await orgRepo().find({
      where: { ownerId: userId },
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    // Orgs I'm a member of
    const memberships = await memberRepo().find({
      where: { userId },
      relations: ['organisation', 'organisation.owner'],
    });

    const memberOrgs = memberships.map((m) => {
      const org = m.organisation;
      (org as any).myPermissions = m.permissions;
      (org as any).membershipId = m.id;
      return org;
    });

    return [...owned, ...memberOrgs];
  }

  async findById(orgId: string, userId: string): Promise<Organisation> {
    const org = await orgRepo().findOne({
      where: { id: orgId },
      relations: ['owner', 'members', 'members.user'],
    });
    if (!org) throw ApiError.notFound('Organisation not found');

    // Must be owner or member
    if (org.ownerId !== userId) {
      const isMember = await memberRepo().findOne({
        where: { organisationId: orgId, userId },
      });
      if (!isMember) throw ApiError.forbidden('Not a member of this organisation');
    }

    return org;
  }

  async update(orgId: string, userId: string, dto: UpdateOrganisationDto): Promise<Organisation> {
    const org = await orgRepo().findOne({ where: { id: orgId, ownerId: userId } });
    if (!org) throw ApiError.notFound('Organisation not found');

    if (dto.name) org.name = dto.name;
    return orgRepo().save(org);
  }

  async updateLogo(orgId: string, userId: string, logoUrl: string): Promise<Organisation> {
    const org = await orgRepo().findOne({ where: { id: orgId, ownerId: userId } });
    if (!org) throw ApiError.notFound('Organisation not found');
    org.logoUrl = logoUrl;
    return orgRepo().save(org);
  }

  async remove(orgId: string, userId: string): Promise<void> {
    const org = await orgRepo().findOne({ where: { id: orgId, ownerId: userId } });
    if (!org) throw ApiError.notFound('Organisation not found');
    await orgRepo().remove(org);
  }

  // ─── Access check helper ─────────────────────────────

  private async requireStaffAccess(orgId: string, userId: string): Promise<Organisation> {
    const org = await orgRepo().findOne({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organisation not found');

    if (org.ownerId === userId) return org;

    const membership = await memberRepo().findOne({
      where: { organisationId: orgId, userId },
    });
    if (!membership || !membership.permissions.includes(OrgPermission.MANAGE_STAFF)) {
      throw ApiError.forbidden('You do not have permission to manage staff');
    }

    return org;
  }

  // ─── Invites ─────────────────────────────────────────

  async invite(orgId: string, invitedById: string, dto: InviteStaffDto): Promise<OrganisationInvite> {
    const org = await this.requireStaffAccess(orgId, invitedById);

    // Check if already a member
    const existingUser = await userRepo().findOne({ where: { email: dto.email } });
    if (existingUser) {
      const existing = await memberRepo().findOne({
        where: { organisationId: orgId, userId: existingUser.id },
      });
      if (existing) throw ApiError.conflict('User is already a member of this organisation');
    }

    // Check for existing pending invite
    const pendingInvite = await inviteRepo().findOne({
      where: { organisationId: orgId, email: dto.email, status: 'pending' },
    });
    if (pendingInvite) throw ApiError.conflict('A pending invite already exists for this email');

    const invite = inviteRepo().create({
      organisationId: orgId,
      email: dto.email,
      permissions: dto.permissions,
      invitedById,
    });

    const saved = await inviteRepo().save(invite);

    // Send email
    try {
      await this.emailService.sendOrgInvite(dto.email, org.name);
    } catch {
      // Non-blocking — invite is still saved
    }

    // In-app notification (if user exists)
    if (existingUser) {
      try {
        await notificationService.create({
          userId: existingUser.id,
          type: NotificationType.ORGANISATION,
          title: 'Organisation Invite',
          message: `You've been invited to join ${org.name}`,
          relatedEntityId: saved.id,
          relatedEntityType: 'organisation',
        });
      } catch (err) { console.error('[Notification]', err); }
    }

    return saved;
  }

  async getInvites(orgId: string, userId: string): Promise<OrganisationInvite[]> {
    await this.requireStaffAccess(orgId, userId);
    return inviteRepo().find({
      where: { organisationId: orgId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeInvite(orgId: string, inviteId: string, userId: string): Promise<void> {
    await this.requireStaffAccess(orgId, userId);
    const invite = await inviteRepo().findOne({
      where: { id: inviteId, organisationId: orgId, status: 'pending' },
    });
    if (!invite) throw ApiError.notFound('Invite not found');
    await inviteRepo().remove(invite);
  }

  // ─── Invite acceptance (called by the invited user) ──

  async getMyInvites(email: string): Promise<OrganisationInvite[]> {
    return inviteRepo().find({
      where: { email, status: 'pending' },
      relations: ['organisation'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptInvite(inviteId: string, userId: string, email: string): Promise<OrganisationMember> {
    const invite = await inviteRepo().findOne({
      where: { id: inviteId, email, status: 'pending' },
    });
    if (!invite) throw ApiError.notFound('Invite not found');

    // Create membership
    const member = memberRepo().create({
      organisationId: invite.organisationId,
      userId,
      permissions: invite.permissions,
    });

    const saved = await memberRepo().save(member);

    // Mark invite as accepted
    invite.status = 'accepted';
    await inviteRepo().save(invite);

    // Notify org owner
    try {
      const org = await orgRepo().findOne({ where: { id: invite.organisationId } });
      const user = await userRepo().findOne({ where: { id: userId } });
      if (org) {
        await notificationService.create({
          userId: org.ownerId,
          type: NotificationType.ORGANISATION,
          title: 'Invite Accepted',
          message: `${user?.firstName || 'A user'} accepted your invitation to ${org.name}`,
          relatedEntityId: org.id,
          relatedEntityType: 'organisation',
        });
      }
    } catch (err) { console.error('[Notification]', err); }

    return saved;
  }

  async declineInvite(inviteId: string, email: string): Promise<void> {
    const invite = await inviteRepo().findOne({
      where: { id: inviteId, email, status: 'pending' },
    });
    if (!invite) throw ApiError.notFound('Invite not found');
    invite.status = 'declined';
    await inviteRepo().save(invite);
  }

  // ─── Members ─────────────────────────────────────────

  async getMembers(orgId: string, userId: string): Promise<OrganisationMember[]> {
    // Any org member can view the member list
    const org = await orgRepo().findOne({ where: { id: orgId } });
    if (!org) throw ApiError.notFound('Organisation not found');
    if (org.ownerId !== userId) {
      const isMember = await memberRepo().findOne({ where: { organisationId: orgId, userId } });
      if (!isMember) throw ApiError.forbidden('Not a member of this organisation');
    }
    return memberRepo().find({
      where: { organisationId: orgId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async updateMemberPermissions(
    orgId: string,
    memberId: string,
    userId: string,
    dto: UpdateMemberPermissionsDto,
  ): Promise<OrganisationMember> {
    await this.requireStaffAccess(orgId, userId);
    const member = await memberRepo().findOne({
      where: { id: memberId, organisationId: orgId },
    });
    if (!member) throw ApiError.notFound('Member not found');
    member.permissions = dto.permissions;
    return memberRepo().save(member);
  }

  async removeMember(orgId: string, memberId: string, userId: string): Promise<void> {
    await this.requireStaffAccess(orgId, userId);
    const member = await memberRepo().findOne({
      where: { id: memberId, organisationId: orgId },
    });
    if (!member) throw ApiError.notFound('Member not found');

    // Check the org to prevent owner from removing themselves
    const org = await orgRepo().findOne({ where: { id: orgId } });
    if (org && member.userId === org.ownerId) {
      throw ApiError.badRequest('Cannot remove the organisation owner');
    }

    await memberRepo().remove(member);
  }
}
