import { IsUUID, IsObject } from 'class-validator';

export class CreateGenericTableRowDto {
  @IsUUID()
  tableId: string;

  @IsObject()
  data: Record<string, any>;
}
