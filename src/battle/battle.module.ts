import { forwardRef, Module } from '@nestjs/common';
import { BattleController } from './battle.controller';
import { BattleService } from './battle.service';
import { BattleGateway } from './battle.gateway';
import { RedisModule } from 'src/redis/redis.module';
import { UserRepository } from 'src/user/repositories/user.repository';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';
import { BullModule } from '@nestjs/bullmq';
import { BATTLE_QUEUE } from './battle.constants';
import { BattleProcessor } from './battle.processor';

@Module({
  imports: [RedisModule, BullModule.registerQueue({ name: BATTLE_QUEUE })],
  controllers: [BattleController],
  providers: [BattleService, BattleGateway, UserRepository, WsAuthGuard, BattleProcessor],
})
export class BattleModule {}
