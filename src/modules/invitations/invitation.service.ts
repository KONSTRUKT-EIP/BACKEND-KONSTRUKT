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
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationMailerService } from './invitation-mailer.service';

const invitationPublicSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  sentAt: true,
  deliveryMethod: true,
  organization: { select: { id: true, name: true } },
  site: { select: { id: true, name: true, city: true } },
} satisfies Prisma.InvitationSelect;

type PublicInvitation = Prisma.InvitationGetPayload<{
  select: typeof invitationPublicSelect;
}>;

@Injectable()
export class InvitationService {
  private readonly invitationLifetimeMs = this.getInvitationLifetimeMs();
  private readonly appUrl =
    process.env.APP_URL?.replace(/\/$/, '') ?? 'https://app.konstrukt.io';

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailer: InvitationMailerService,
  ) {}

  async create(
    siteId: string,
    dto: CreateInvitationDto,
    invitedById: string,
    organizationId?: string | null,
    role?: UserRole,
  ) {
    this.assertAdmin(role);
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
        sentAt: now,
      },
      select: invitationPublicSelect,
    });

    const link = this.buildLink(token);
    this.mailer.sendInvitation(invitation.email, link);
    return { invitation, link };
  }

  async getByToken(token: string) {
    const invitation = await this.findValidInvitation(token);
    return this.toOnboardingView(invitation);
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

  async resend(
    invitationId: string,
    invitedById: string,
    organizationId?: string | null,
    role?: UserRole,
  ) {
    this.assertAdmin(role);
    const invitation = await this.findInvitationInOrganization(
      invitationId,
      organizationId,
    );
    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    const token = this.generateToken();
    const now = new Date();
    const updated: PublicInvitation = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(now.getTime() + this.invitationLifetimeMs),
        sentAt: now,
        invitedById,
      },
      select: invitationPublicSelect,
    });

    const link = this.buildLink(token);
    this.mailer.sendInvitation(updated.email, link);
    return { invitation: updated, link };
  }

  async remove(
    invitationId: string,
    organizationId?: string | null,
    role?: UserRole,
  ) {
    this.assertAdmin(role);
    const invitation = await this.findInvitationInOrganization(
      invitationId,
      organizationId,
    );
    if (invitation.acceptedAt) {
      throw new BadRequestException('Invitation has already been accepted');
    }

    await this.prisma.invitation.delete({ where: { id: invitation.id } });
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
    if (invitation.acceptedAt || invitation.expiresAt <= new Date()) {
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

  private assertAdmin(role?: UserRole) {
    if (role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only organization administrators can manage invitations',
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

  private getInvitationLifetimeMs() {
    const hours = Number(process.env.INVITATION_EXPIRES_IN_HOURS ?? 48);
    return (Number.isFinite(hours) && hours > 0 ? hours : 48) * 60 * 60 * 1000;
  }
}
