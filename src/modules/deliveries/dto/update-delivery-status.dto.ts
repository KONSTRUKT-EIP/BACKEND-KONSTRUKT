import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    enum: DeliveryStatus,
    description: 'Nouveau statut livraison',
  })
  @IsEnum(DeliveryStatus)
  status: DeliveryStatus;

  @ApiPropertyOptional({
    example: '2026-09-04',
    description: 'Date de reception (optionnelle, ISO date)',
  })
  @IsOptional()
  @IsISO8601({ strict: false })
  receivedDate?: string;
}
