import { PartialType } from '@nestjs/swagger';
import { CreateResourceUsageDto } from './create-resource-usage.dto';

export class UpdateResourceUsageDto extends PartialType(
  CreateResourceUsageDto,
) {}
