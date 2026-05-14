import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsPositive, Min } from "class-validator";

export class GetTransactionsDto {
  @ApiProperty({ required: false, example: 0 })
  @IsNumber()
  @Min(0)
  skip?: number = 0;
 
  @ApiProperty({ required: false, example: 20 })
  @IsNumber()
  @IsPositive()
  take?: number = 20;
}