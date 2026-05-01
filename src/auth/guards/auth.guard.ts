import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public-decorator';
import { UserRepository } from 'src/user/repositories/user.repository';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector,private readonly userRepository:UserRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request.session.userId) throw new UnauthorizedException();

    const user = await this.userRepository.findUnique({
      where: { id: request.session.userId },
    });

    if (!user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }
}