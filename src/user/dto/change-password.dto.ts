import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldSecret@1' })
  @IsString()
  currentPassword: string;
 
  @ApiProperty({ example: 'NewSecret@2' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'New password must contain at least 1 uppercase, 1 number and 1 special character',
  })
  newPassword: string;
}