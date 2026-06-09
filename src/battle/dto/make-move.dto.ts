import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class MakeMoveDto {
  @ApiProperty({ enum: ['head', 'body', 'legs'], example: 'head' })
  @IsEnum(['head', 'body', 'legs'])
  attackZone: 'head' | 'body' | 'legs';

  @ApiProperty({ enum: ['head', 'body', 'legs'], example: 'body' })
  @IsEnum(['head', 'body', 'legs'])
  defenseZone: 'head' | 'body' | 'legs';
}
