import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class SpinDto {
  @ApiProperty({
    example: 1,
    description: 'Bet per line (multiplied by active lines count)',
    minimum: 0.01,
    maximum: 100,
  })
  @IsNumber()
  @IsPositive()
  @Min(0.01)
  @Max(100)
  betPerLine: number;

  @ApiProperty({
    example: 20,
    description: 'Number of active paylines (1-20)',
    minimum: 1,
    maximum: 20,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  activeLines: number;
}