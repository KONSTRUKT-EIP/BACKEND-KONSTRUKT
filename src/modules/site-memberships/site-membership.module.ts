import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';
import { SiteMembershipController } from './site-membership.controller';
import { SiteMembershipService } from './site-membership.service';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [SiteMembershipController],
  providers: [SiteMembershipService],
})
export class SiteMembershipModule {}
