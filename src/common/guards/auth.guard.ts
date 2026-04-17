import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRepository } from 'src/user/user.repository';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userRepository: UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const email: string =  request.headers['x-email']
    const password: string =  request.headers['x-password']

    if (!email || !password) {
      throw new UnauthorizedException('email and password are required');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.password,password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    request.currentUser = user;
    return true;
  }
}