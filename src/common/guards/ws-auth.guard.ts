import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { UserRepository } from 'src/user/repositories/user.repository';
import cookie from 'cookie';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();

    const sessionId = this.getSessionId(client);
    
    if (!sessionId) return false;

    const session = await this.getSession(sessionId);
  
    if (!session?.userId) return false;

    const cacheKey = `user:${session.userId}`;

    const cached = await this.redis.get(cacheKey);
    let user;

    if (cached) {
      user = JSON.parse(cached);
    } else {
      user = await this.userRepository.findUnique({
        where: { id: session.userId },
      });

      if (!user) return false;

      await this.redis.set(cacheKey, JSON.stringify(user), 'EX', 300);
    }

    client.data.user = user;

    return true;
  }

  private getSessionId(client: any): string | null {
    const rawCookie = client.handshake.headers.cookie;
    if (!rawCookie) return null;

    const cookies = cookie.parse(rawCookie);

    const cookieName = this.configService.getOrThrow<string>('SESSION_NAME');
    const sessionCookie = cookies[cookieName];

    if (!sessionCookie) return null;

    return sessionCookie.startsWith('s:')
      ? sessionCookie.slice(2).split('.')[0]
      : sessionCookie;
  }

  private getSession(sessionId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const sessionsFolder = this.configService.getOrThrow<string>('SESSION_FOLDER');
      this.redis.get(`${sessionsFolder}${sessionId}`, (err, data) => {
        if (err) return reject(err);
        resolve(data ? JSON.parse(data) : null);
      });
    });
  }
}