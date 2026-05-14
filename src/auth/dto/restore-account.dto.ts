import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class RestoreAccountDto {
  @ApiProperty({ example: 'player123@gmail.com' })
  @IsEmail()
  email: string;
 
  @ApiProperty({ example: 'Wrty@123' })
  @IsString()
  password: string;
}
