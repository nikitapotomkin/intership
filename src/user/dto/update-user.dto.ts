import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsEnum, IsOptional } from "class-validator";
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
 
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBanned?: boolean;
 
  @ApiPropertyOptional({ description: 'Ban expiry date — null for permanent ban' })
  @IsOptional()
  @IsDateString()
  banEndAt?: string;
 
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}