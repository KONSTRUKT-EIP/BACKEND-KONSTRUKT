import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcrypt';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { userPayload } from '../auth/jwt.strategy';
import { SiteAccessService } from '../../shared/authorization/site-access.service';
import {
  canAssignRole,
  isOrganizationAdmin,
  SiteAction,
} from '../../shared/authorization/site-policies';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  InvitationEmailData,
  InvitationMailerService,
} from './invitation-mailer.service';

const invitationPublicSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  acceptedAt: true,
  canceledAt: true,
  createdAt: true,
  sentAt: true,
  deliveryMethod: true,
  organization: { select: { id: true, name: true } },
  site: { select: { id: true, name: true, city: true } },
} satisfies Prisma.InvitationSelect;

type PublicInvitation = Prisma.InvitationGetPayload<{
  select: typeof invitationPublicSelect;
}>;

export type InvitationStatus =
  'PENDING' | 'SENT' | 'EXPIRED' | 'ACCEPTED' | 'CANCELLED';

@Injectable()
export class InvitationService {
  private readonly invitationLifetimeMs = this.getInvitationLifetimeMs();
  private readonly appUrl =
    process.env.APP_URL?.replace(/\/$/, '') ?? 'https://app.konstrukt.io';

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailer: InvitationMailerService,
    private readonly siteAccess: SiteAccessService,
  ) {}

  async create(
    siteId: string,
    dto: CreateInvitationDto,
    invitedById: string,
    organizationId: string | null | undefined,
    actorRole: UserRole,
  ) {
    this.assertCanInvite(actorRole, dto.role);
    const site = await this.findSiteInOrganization(siteId, organizationId);
    const token = this.generateToken();
    const now = new Date();
    const invitation: PublicInvitation = await this.prisma.invitation.create({
      data: {
        email: dto.email.toLowerCase(),
        organizationId: site.organizationId,
        siteId: site.id,
        role: dto.role,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(now.getTime() + this.invitationLifetimeMs),
        invitedById,
        sentAt: null,
      },
      select: invitationPublicSelect,
    });

    const link = this.buildLink(token);
    const emailData = await this.buildInvitationEmailData(
      site.id,
      invitation.role,
      invitedById,
      link,
    );
    await this.mailer.sendInvitation(invitation.email, emailData);
    const sentInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { sentAt: new Date() },
      select: invitationPublicSelect,
    });
    return { invitation: sentInvitation ?? invitation, link };
  }

  async getByToken(token: string) {
    const invitation = await this.findValidInvitation(token);
    return this.toOnboardingView(invitation);
  }

  async findAll(organizationId?: string | null, role?: UserRole) {
    if (!isOrganizationAdmin(role)) {
      throw new ForbiddenException(
        'Only organization admins can list invitations',
      );
    }
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }

    const invitations: PublicInvitation[] =
      await this.prisma.invitation.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        select: invitationPublicSelect,
      });

    return invitations.map((invitation) => this.toAdminView(invitation));
  }

  async accept(token: string, dto: AcceptInvitationDto) {
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const password = await hash(dto.password, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({
        where: { tokenHash },
        include: { site: true },
      });

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }
      if (invitation.acceptedAt || invitation.expiresAt <= now) {
        throw new BadRequestException('Invitation is expired or already used');
      }

      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }

      const claimed = await tx.invitation.updateMany({
        where: {
          id: invitation.id,
          acceptedAt: null,
          expiresAt: { gt: now },
        },
        data: { acceptedAt: now },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Invitation is expired or already used');
      }

      const user = await tx.user.create({
        data: {
          email: invitation.email,
          password,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: invitation.role,
          organizationId: invitation.organizationId,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          createdAt: true,
        },
      });

      await tx.siteMembership.create({
        data: {
          userId: user.id,
          siteId: invitation.siteId,
          role: invitation.role,
        },
      });

      return user;
    });

    const tokens = await this.authService.authenticateUser({
      userId: result.id,
      organizationId: result.organizationId,
      role: result.role,
    });
    return { ...tokens, user: result };
  }

  async resend(invitationId: string, user: userPayload) {
    const invitation = await this.findManageableInvitation(invitationId, user);
    const invitedById = user.userId;
    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }
    if (invitation.canceledAt) {
      throw new BadRequestException('Invitation has been cancelled');
    }

    const token = this.generateToken();
    const now = new Date();
    const updated: PublicInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(now.getTime() + this.invitationLifetimeMs),
        sentAt: null,
        invitedById,
      },
      select: invitationPublicSelect,
    });

    const link = this.buildLink(token);
    const emailData = await this.buildInvitationEmailData(
      invitation.siteId,
      invitation.role,
      invitedById,
      link,
    );
    await this.mailer.sendInvitation(updated.email, emailData);
    const sentInvitation = await this.prisma.invitation.update({
      where: { id: updated.id },
      data: { sentAt: new Date() },
      select: invitationPublicSelect,
    });
    return { invitation: sentInvitation ?? updated, link };
  }

  async remove(invitationId: string, user: userPayload) {
    const invitation = await this.findManageableInvitation(invitationId, user);
    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }
    if (invitation.canceledAt) {
      throw new BadRequestException('Invitation has already been cancelled');
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { canceledAt: new Date() },
      select: invitationPublicSelect,
    });
    return { message: 'Invitation cancelled' };
  }

  private async findValidInvitation(token: string): Promise<PublicInvitation> {
    const invitation: PublicInvitation | null =
      await this.prisma.invitation.findUnique({
        where: { tokenHash: this.hashToken(token) },
        select: invitationPublicSelect,
      });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (
      invitation.acceptedAt ||
      invitation.canceledAt ||
      invitation.expiresAt <= new Date()
    ) {
      throw new BadRequestException('Invitation is expired or already used');
    }
    return invitation;
  }

  private async findSiteInOrganization(
    siteId: string,
    organizationId?: string | null,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, organizationId },
    });
    if (!site) {
      throw new NotFoundException(`Site ${siteId} not found`);
    }
    return site;
  }

  private async findInvitationInOrganization(
    invitationId: string,
    organizationId?: string | null,
  ) {
    if (!organizationId) {
      throw new ForbiddenException('Organization context is required');
    }
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    return invitation;
  }

  private async buildInvitationEmailData(
    siteId: string,
    role: UserRole,
    invitedById: string,
    invitationLink: string,
  ): Promise<InvitationEmailData> {
    const [site, inviter] = await Promise.all([
      this.prisma.site.findUnique({
        where: { id: siteId },
        select: {
          name: true,
          organization: { select: { name: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: invitedById },
        select: { firstName: true, lastName: true },
      }),
    ]);

    if (!site || !inviter) {
      throw new NotFoundException('Invitation context not found');
    }

    return {
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
      organizationName: site.organization.name,
      siteName: site.name,
      role,
      invitationLink,
      expirationHours: Number(process.env.INVITATION_EXPIRES_IN_HOURS ?? 48),
    };
  }

  private async findManageableInvitation(
    invitationId: string,
    user: userPayload,
  ) {
    const invitation = await this.findInvitationInOrganization(
      invitationId,
      user.organizationId,
    );
    const actorRole = await this.siteAccess.assertAccess(
      invitation.siteId,
      user,
      SiteAction.MANAGE_INVITATIONS,
    );
    this.assertCanInvite(actorRole, invitation.role);
    return invitation;
  }

  private assertCanInvite(actorRole: UserRole, invitedRole: UserRole) {
    if (!canAssignRole(actorRole, invitedRole)) {
      throw new ForbiddenException(
        `Role ${actorRole} cannot manage invitations for role ${invitedRole}`,
      );
    }
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private buildLink(token: string) {
    return `${this.appUrl}/invite/${token}`;
  }

  private toOnboardingView(invitation: PublicInvitation) {
    return {
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
      site: invitation.site,
    };
  }

  private toAdminView(invitation: PublicInvitation) {
    return {
      ...invitation,
      status: this.getStatus(invitation),
    };
  }

  private getStatus(invitation: PublicInvitation): InvitationStatus {
    if (invitation.canceledAt) return 'CANCELLED';
    if (invitation.acceptedAt) return 'ACCEPTED';
    if (invitation.expiresAt <= new Date()) return 'EXPIRED';
    return invitation.sentAt ? 'SENT' : 'PENDING';
  }

  private getInvitationLifetimeMs() {
    const hours = Number(process.env.INVITATION_EXPIRES_IN_HOURS ?? 48);
    return (Number.isFinite(hours) && hours > 0 ? hours : 48) * 60 * 60 * 1000;
  }
}
