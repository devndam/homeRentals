import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, OrgPermission } from '../types';
import { ApiError } from '../utils/api-error';
import { AppDataSource } from '../config/data-source';
import { OrganisationMember } from '../modules/organisations/organisation-member.entity';
import { Organisation } from '../modules/organisations/organisation.entity';

/**
 * Reads `X-Organisation-Id` header to resolve the effective owner context.
 * - No header → personal mode (effectiveOwnerId = req.user.sub)
 * - With header → staff/org mode (effectiveOwnerId = org.ownerId)
 */
export function resolveOrganisation() {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const orgId = req.headers['x-organisation-id'] as string | undefined;

    if (!orgId) {
      // Personal mode
      req.effectiveOwnerId = req.user.sub;
      req.organisation = null;
      req.orgMembership = null;
      return next();
    }

    const org = await AppDataSource.getRepository(Organisation).findOne({
      where: { id: orgId },
    });

    if (!org) {
      throw ApiError.notFound('Organisation not found');
    }

    // If the user IS the org owner, grant full access
    if (org.ownerId === req.user.sub) {
      req.effectiveOwnerId = org.ownerId;
      req.organisation = org;
      req.orgMembership = null; // owner doesn't need a membership record
      return next();
    }

    // Otherwise, check membership
    const membership = await AppDataSource.getRepository(OrganisationMember).findOne({
      where: { organisationId: orgId, userId: req.user.sub },
    });

    if (!membership) {
      throw ApiError.forbidden('You are not a member of this organisation');
    }

    req.effectiveOwnerId = org.ownerId;
    req.organisation = org;
    req.orgMembership = membership;
    next();
  };
}

/**
 * Checks that the current user has the required org permission(s).
 * Skips check if the user is acting in personal mode or is the org owner.
 */
export function requireOrgPermission(...required: OrgPermission[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    // Personal mode — user is the owner, skip permission check
    if (!req.organisation) {
      return next();
    }

    // Org owner has all permissions
    if (req.organisation.ownerId === req.user.sub) {
      return next();
    }

    // Staff — check permissions
    const membership = req.orgMembership as OrganisationMember | null;
    if (!membership) {
      throw ApiError.forbidden('Organisation membership required');
    }

    const memberPerms = membership.permissions || [];
    const missing = required.filter((p) => !memberPerms.includes(p));

    if (missing.length > 0) {
      throw ApiError.forbidden(
        `Missing organisation permission(s): ${missing.join(', ')}`,
      );
    }

    next();
  };
}
