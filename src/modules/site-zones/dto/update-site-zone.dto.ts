import { PartialType } from '@nestjs/swagger';
import { CreateSiteZoneDto } from './create-site-zone.dto';

export class UpdateSiteZoneDto extends PartialType(CreateSiteZoneDto) {}
