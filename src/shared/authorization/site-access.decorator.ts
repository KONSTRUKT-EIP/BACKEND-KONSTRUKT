import { SetMetadata } from '@nestjs/common';
import type { SiteAction } from './site-policies';

export const SITE_ACCESS_KEY = 'site-access';
export const SITE_PERMISSION_KEY = 'site-permission';

export type SiteAccessSource = 'param' | 'query' | 'body';

export const RequireSiteAccess = (
  source: SiteAccessSource = 'param',
  name = 'siteId',
  optional = false,
) => SetMetadata(SITE_ACCESS_KEY, { source, name, optional });

export const SitePermission = (action: SiteAction) =>
  SetMetadata(SITE_PERMISSION_KEY, action);
