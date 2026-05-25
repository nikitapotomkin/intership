import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { ChangePasswordDto } from 'src/auth/dto/change-password.dto';

@ValidatorConstraint({ name: 'IsPasswordsMatching', async: false })
export class PasswordConstraint
  implements ValidatorConstraintInterface
{
  public validate(passwordRepeat: string, args: ValidationArguments) {
    const obj = args.object as ChangePasswordDto;
    return obj.password === passwordRepeat;
  }

  public defaultMessage(validationArguments?: ValidationArguments) {
    return 'The passwords do not match.';
  }
}