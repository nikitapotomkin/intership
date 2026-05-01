import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

export const getRedisConfig = (configService: ConfigService) => {
  return new IORedis({
    host: configService.getOrThrow('REDIS_HOST'),
    port: configService.getOrThrow<number>('REDIS_PORT'),
  });
};