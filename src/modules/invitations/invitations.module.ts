import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { InvitationMailerService } from './invitation-mailer.service';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { SiteInvitationController } from './site-invitation.controller';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';

@Module({
  imports: [PrismaModule, AuthModule, SiteAccessModule],
  controllers: [InvitationController, SiteInvitationController],
  providers: [InvitationService, InvitationMailerService],
})
export class InvitationsModule {}
