import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  SITE_ACCESS_KEY,
  SITE_PERMISSION_KEY,
  type SiteAccessSource,
} from './site-access.decorator';
import { SiteAccessService } from './site-access.service';
import { can, type SiteAction } from './site-policies';
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

function getSiteId(
  request: RequestWithBody,
  source: SiteAccessSource,
  name: string,
): string | undefined {
  switch (source) {
    case 'param':
      return request.params[name];
    case 'query':
      return request.query[name];
    case 'body':
      return request.body[name];
  }
}

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

    const action = this.reflector.getAllAndOverride<SiteAction | undefined>(
      SITE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest<RequestWithBody>();
    const siteId = getSiteId(request, metadata.source, metadata.name);

    if (!siteId) {
      if (!metadata.optional) {
        throw new BadRequestException(`Missing ${metadata.name}`);
      }
      // Sans chantier ciblé, l'action est évaluée avec le rôle global ;
      // le service filtre ensuite sur les chantiers accessibles.
      if (action && !can(request.user.role, action)) {
        throw new ForbiddenException(`Your role does not allow ${action}`);
      }
      return true;
    }

    request.siteRole = await this.siteAccess.assertAccess(
      siteId,
      request.user,
      action,
    );
    return true;
  }
}
