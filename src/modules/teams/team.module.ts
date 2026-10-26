import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { SiteAccessModule } from '../../shared/authorization/site-access.module';

@Module({
  imports: [PrismaModule, SiteAccessModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
