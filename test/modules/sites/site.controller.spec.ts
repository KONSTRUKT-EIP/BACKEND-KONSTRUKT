import {
  SITE_ACCESS_KEY,
  SITE_PERMISSION_KEY,
} from '../../../src/shared/authorization/site-access.decorator';
import { SiteAccessGuard } from '../../../src/shared/authorization/site-access.guard';
import { SiteAction } from '../../../src/shared/authorization/site-policies';
import { SiteController } from '../../../src/modules/sites/site.controller';

describe('SiteController', () => {
  const handlerOf = (name: string): unknown =>
    Object.getOwnPropertyDescriptor(SiteController.prototype, name)?.value;

  const handlers = ['getPhoto', 'setPhoto', 'removePhoto'] as const;

  it.each(handlers)('restreint %s aux membres du chantier cible', (handler) => {
    const method = handlerOf(handler) as object;

    expect(Reflect.getMetadata(SITE_ACCESS_KEY, method)).toEqual({
      source: 'param',
      name: 'id',
      optional: false,
    });
    expect(Reflect.getMetadata('__guards__', method)).toContain(
      SiteAccessGuard,
    );
  });

  it('exige le droit de consultation pour lire la photo', () => {
    expect(
      Reflect.getMetadata(SITE_PERMISSION_KEY, handlerOf('getPhoto') as object),
    ).toBe(SiteAction.VIEW_SITE);
  });
});
