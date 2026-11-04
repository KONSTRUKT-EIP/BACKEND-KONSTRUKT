import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateUserAccessDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
