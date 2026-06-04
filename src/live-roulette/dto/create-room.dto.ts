import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString, Max, Min } from "class-validator";

export class CreateRoomDto {
  @ApiProperty({ example: 'VIP Room #1' })
  @IsString()
  name: string;

  @ApiProperty({ example: 0.01, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  minBet: number;

  @ApiProperty({ example: 1000, maximum: 100_000 })
  @IsNumber()
  @Max(100_000)
  maxBet: number;
}
