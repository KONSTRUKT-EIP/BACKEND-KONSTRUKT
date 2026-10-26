import { SetMetadata } from '@nestjs/common';

export const SITE_ACCESS_KEY = 'site-access';

export type SiteAccessSource = 'param' | 'query' | 'body';

export const RequireSiteAccess = (
  source: SiteAccessSource = 'param',
  name = 'siteId',
  optional = false,
) => SetMetadata(SITE_ACCESS_KEY, { source, name, optional });
