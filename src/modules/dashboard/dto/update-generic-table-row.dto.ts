import { PartialType } from '@nestjs/mapped-types';
import { CreateGenericTableRowDto } from './create-generic-table-row.dto';

export class UpdateGenericTableRowDto extends PartialType(
  CreateGenericTableRowDto,
) {}
