import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getRedisConfig } from 'src/config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_PUB = 'REDIS_PUB';
export const REDIS_SUB = 'REDIS_SUB';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: getRedisConfig,
      inject: [ConfigService],
    },
    {
      provide: REDIS_PUB,
      useFactory: (client: Redis) => client.duplicate(),
      inject: [REDIS_CLIENT],
    },
    {
      provide: REDIS_SUB,
      useFactory: (client: Redis) => client.duplicate(),
      inject: [REDIS_CLIENT],
    }
  ],
  exports: [REDIS_CLIENT, REDIS_PUB, REDIS_SUB],
})
export class RedisModule {}
 