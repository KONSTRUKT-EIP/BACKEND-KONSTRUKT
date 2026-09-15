import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SITE_ACCESS_KEY,
  type SiteAccessSource,
} from './site-access.decorator';
import { SiteAccessService } from './site-access.service';
import type { requestWithUser } from '../../modules/auth/jwt.strategy';

type SiteAccessMetadata = {
  source: SiteAccessSource;
  name: string;
  optional?: boolean;
};

type RequestWithBody = requestWithUser & {
  params: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  body: Record<string, string | undefined>;
};

@Injectable()
export class SiteAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly siteAccess: SiteAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<SiteAccessMetadata>(
      SITE_ACCESS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithBody>();
    const source = request[metadata.source];
    const siteId = source?.[metadata.name];

    if (!siteId) {
      if (metadata.optional) return true;
      throw new BadRequestException(`Missing ${metadata.name}`);
    }

    await this.siteAccess.assertAccess(siteId, request.user);
    return true;
  }
}
