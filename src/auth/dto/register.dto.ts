import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'player123', description: 'Unique username' })
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, _ and -',
  })
  username: string;

  @ApiProperty({ example: 'player123@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Wrty@123',
    description: 'Min 8 chars, at least 1 uppercase, 1 number, 1 special char',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number and 1 special character',
  })
  password: string;
}
