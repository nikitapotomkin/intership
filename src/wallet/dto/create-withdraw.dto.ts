// create-withdraw.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, Length, Max } from 'class-validator';

export class CreateWithdrawDto {
  @ApiProperty({ example: 30.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(100_000)
  amount: number;

  @ApiProperty({ example: '4242', description: 'Last 4 digits of card' })
  @IsString()
  @Length(4, 4)
  cardLast4: string;
}