import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public-decorator';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { UserRepository } from 'src/user/repositories/user.repository';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request.session.userId) throw new UnauthorizedException();

    const userId = request.session.userId;
    const cacheKey = `user:${userId}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      request.user = JSON.parse(cached);
      return true;
    }

    const user = await this.userRepository.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException();

    await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 300);

    request.user = user;
    return true;
  }
}