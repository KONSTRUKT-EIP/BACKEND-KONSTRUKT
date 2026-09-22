import { IsObject, IsOptional } from 'class-validator';

export class UpdateGenericTableRowDto {
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
