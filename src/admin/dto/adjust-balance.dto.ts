import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, IsString } from "class-validator";

export class AdjustBalanceDto {
  @ApiProperty({
    description: 'Amount to add (positive) or subtract (negative)',
    example: 100,
  })
  @IsInt()
  amount: number;
 
  @ApiPropertyOptional({ example: 'Manual top-up by admin' })
  @IsOptional()
  @IsString()
  reason?: string;
}