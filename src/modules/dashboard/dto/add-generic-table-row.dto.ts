import { IsObject } from 'class-validator';

export class AddGenericTableRowDto {
  @IsObject()
  data: Record<string, any>;
}
