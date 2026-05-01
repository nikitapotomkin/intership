import { ApiProperty } from "@nestjs/swagger";

export class ResponseDto {
  @ApiProperty()
  user: Record<string, any>;
}