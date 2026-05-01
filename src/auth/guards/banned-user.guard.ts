import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class BannedUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) return true;

    if (user.isDeleted) {
      throw new ForbiddenException('Account has been deleted');
    }

    if (user.isBanned) {
      throw new ForbiddenException(`Account is banned`);
    }

    return true;
  }
}