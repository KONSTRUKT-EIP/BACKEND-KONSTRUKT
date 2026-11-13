import { SITE_PERMISSION_KEY } from '../../../src/shared/authorization/site-access.decorator';
import { SiteAction } from '../../../src/shared/authorization/site-policies';
import { SiteZoneController } from '../../../src/modules/site-zones/site-zone.controller';

describe('SiteZoneController', () => {
  const permissionOf = (name: string): unknown =>
    Reflect.getMetadata(
      SITE_PERMISSION_KEY,
      Object.getOwnPropertyDescriptor(SiteZoneController.prototype, name)
        ?.value as object,
    );

  it.each(['findAll', 'findOne'])(
    '%s est ouvert a tout membre du chantier',
    (handler) => {
      expect(permissionOf(handler)).toBe(SiteAction.VIEW_SITE);
    },
  );

  it.each(['create', 'update', 'remove'])(
    '%s exige le droit de modifier le chantier',
    (handler) => {
      expect(permissionOf(handler)).toBe(SiteAction.UPDATE_SITE);
    },
  );
});
