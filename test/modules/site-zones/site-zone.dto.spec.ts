import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateSiteZoneDto } from '../../../src/modules/site-zones/dto/create-site-zone.dto';
import { UpdateSiteZoneDto } from '../../../src/modules/site-zones/dto/update-site-zone.dto';

describe('SiteZone DTOs', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('trims name and level on create', async () => {
    const dto = (await validationPipe.transform(
      { name: '  Batiment A  ', level: ' R+1 ' },
      { type: 'body', metatype: CreateSiteZoneDto },
    )) as CreateSiteZoneDto;

    expect(dto.name).toBe('Batiment A');
    expect(dto.level).toBe('R+1');
  });

  it('trims name on update', async () => {
    const dto = (await validationPipe.transform(
      { name: '  Batiment B ' },
      { type: 'body', metatype: UpdateSiteZoneDto },
    )) as UpdateSiteZoneDto;

    expect(dto.name).toBe('Batiment B');
  });

  it('rejects a blank name', async () => {
    await expect(
      validationPipe.transform(
        { name: '   ', level: 'R+1' },
        { type: 'body', metatype: CreateSiteZoneDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
