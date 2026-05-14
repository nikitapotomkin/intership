import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetClientSeedDto {
  @ApiProperty({ example: 'my-random-seed-123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  clientSeed: string;
}