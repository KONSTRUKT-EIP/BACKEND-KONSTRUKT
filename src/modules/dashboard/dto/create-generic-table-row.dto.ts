import { IsUUID, IsObject } from 'class-validator';

export class CreateGenericTableRowDto {
  @IsUUID('all')
  tableId: string;

  @IsObject()
  data: Record<string, any>;
}
