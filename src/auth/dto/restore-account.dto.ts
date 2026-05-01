import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class RestoreAccountDto {
  @ApiProperty({ example: 'player@game.com' })
  @IsEmail()
  email: string;
 
  @ApiProperty({ example: 'Secret@123' })
  @IsString()
  password: string;
}