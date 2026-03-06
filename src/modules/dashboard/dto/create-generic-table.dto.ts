import { IsString, IsUUID, IsObject } from 'class-validator';

export class CreateGenericTableDto {
  @IsString()
  name: string;

  @IsObject()
  columns: object;

  @IsUUID()
  siteId: string;
}
