import { Module } from '@nestjs/common';
import { PrismaModule } from '../../lib/prisma/prisma.module';
import { ResourceUsagesController } from './resource-usages.controller';
import { ResourceUsagesService } from './resource-usages.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourceUsagesController],
  providers: [ResourceUsagesService],
  exports: [ResourceUsagesService],
})
export class ResourceUsagesModule {}
