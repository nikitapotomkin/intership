import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class BanUserDto {
  @ApiPropertyOptional({
    description: 'Ban expiry date (ISO 8601). Omit for permanent ban.',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  banEndAt?: string;
 
  @ApiPropertyOptional({ example: 'Cheating' })
  @IsOptional()
  @IsString()
  reason?: string;
}