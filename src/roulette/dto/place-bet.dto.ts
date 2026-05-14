import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsPositive, IsString } from "class-validator";
import { BetType } from "@prisma/client";

export class PlaceBetDto {
  @ApiProperty({ enum: BetType, example: BetType.COLOR })
  @IsEnum(BetType)
  betType: BetType;
 
  @ApiProperty({
    example: 'red',
    description:
      'NUMBER: "0"–"36" | COLOR: "red"|"black"|"green" | ODD_EVEN: "odd"|"even" | DOZEN: "1-12"|"13-24"|"25-36" | COLUMN: "1"|"2"|"3" | HIGH_LOW: "1-18"|"19-36"',
  })
  @IsString()
  betValue: string;
 
  @ApiProperty({ example: 10.00 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}