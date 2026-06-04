import { ApiProperty } from "@nestjs/swagger";
import { BetType } from "@prisma/client";
import { IsEnum, IsNumber, IsPositive, IsString, Max, Min } from "class-validator";

export class LivePlaceBetDto {
  @ApiProperty({ example: 'clx1abc123' })
  @IsString()
  roomId: string;

  @ApiProperty({ enum: BetType, example: BetType.NUMBER })
  @IsEnum(BetType)
  betType: BetType;

  @ApiProperty({
    example: '17',
    description:
      'NUMBER: "0"-"36" | COLOR: "red"|"black"|"green" | ODD_EVEN: "odd"|"even" | HIGH_LOW: "1-18"|"19-36" | DOZEN: "1-12"|"13-24"|"25-36" | COLUMN: "1"|"2"|"3"',
  })
  @IsString()
  betValue: string;

  @ApiProperty({ example: 10.5, minimum: 0.01, maximum: 100_000 })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(100_000)
  amount: number;
}