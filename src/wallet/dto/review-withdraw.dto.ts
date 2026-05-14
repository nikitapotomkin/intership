import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { WithdrawStatus } from '@prisma/client';

export class ReviewWithdrawDto {
  @ApiProperty({ enum: [WithdrawStatus.APPROVED, WithdrawStatus.REJECTED] })
  @IsEnum([WithdrawStatus.APPROVED, WithdrawStatus.REJECTED])
  status: WithdrawStatus;

  @ApiProperty({ required: false, example: 'Insufficient documents' })
  @IsOptional()
  @IsString()
  comment?: string;
}