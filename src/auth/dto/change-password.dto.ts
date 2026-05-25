import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Validate,
} from 'class-validator';
import { PasswordConstraint } from 'src/common/utils/password-constraint';

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 number and 1 special character',
  })
  password: string;

  @IsString()
  @Validate(PasswordConstraint, {
    message: 'Passwords do not match.',
  })
  passwordRepeat: string;
}
