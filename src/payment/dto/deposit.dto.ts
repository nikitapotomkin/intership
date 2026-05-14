import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsPositive } from "class-validator";

export class DepositDto {
  @ApiProperty({ example: 100.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: ['stripe'], example: 'stripe' })
  @IsEnum(['stripe', 'crypto'])
  provider: 'stripe' | 'crypto';
}