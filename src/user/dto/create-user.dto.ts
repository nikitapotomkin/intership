import { IsEmail, IsNotEmpty, IsNumber, IsPositive, MinLength } from 'class-validator';
 
export class CreateUserDto {
  @IsEmail()
  email: string;
 
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
 