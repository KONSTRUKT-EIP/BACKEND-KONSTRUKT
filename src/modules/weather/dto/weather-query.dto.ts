import { IsLatitude, IsLongitude, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WeatherQueryDto {
  @ApiPropertyOptional({
    description: 'Latitude de la localisation',
    example: 48.8566,
  })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude de la localisation',
    example: 2.3522,
  })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Nom de la ville',
    example: 'Paris',
  })
  @IsOptional()
  @IsString()
  city?: string;
}
