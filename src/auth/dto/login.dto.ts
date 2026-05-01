import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: 'player123', description: 'Email or username' })
  @IsString()
  login: string;
 
  @ApiProperty({ example: 'Wrty@123' })
  @IsString()
  password: string;
}
 