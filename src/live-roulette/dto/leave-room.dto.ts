import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LeaveRoomDto {
  @ApiProperty({ example: 'clx1abc123' })
  @IsString()
  roomId: string;
}