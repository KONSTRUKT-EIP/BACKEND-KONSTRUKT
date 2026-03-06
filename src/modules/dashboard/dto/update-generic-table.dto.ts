import { PartialType } from '@nestjs/mapped-types';
import { CreateGenericTableDto } from './create-generic-table.dto';

export class UpdateGenericTableDto extends PartialType(CreateGenericTableDto) {}
