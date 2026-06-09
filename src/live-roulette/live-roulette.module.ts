import { Module } from '@nestjs/common';
import { LiveRouletteGateway } from './live-roulette.gateway';
import { LiveRouletteService } from './services/live-roulette.service';
import { LiveRouletteRoomService } from './services/live-roulette-room.service';
import { LiveRouletteController } from './live-roulette.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { RedisModule } from 'src/redis/redis.module';
import { GameSessionRepository } from './repositories/game-session.repository';
import { RouletteBetRepository } from './repositories/roulette-bet.repository';
import { RouletteRoundRepository } from './repositories/roulette-round.repository';
import { LiveRouletteRoomRepository } from './repositories/live-roulette-room.repository';
import { UserRepository } from 'src/user/repositories/user.repository';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';
import { LiveRouletteProcessor } from './live-roulette.processor';
import { BullModule } from '@nestjs/bullmq';
import { LIVE_ROULETTE_QUEUE } from './live-roulette.constants';

@Module({
  imports: [RedisModule, WalletModule, BullModule.registerQueue({ name: LIVE_ROULETTE_QUEUE }),],
  controllers: [LiveRouletteController],
  providers: [
    LiveRouletteGateway,
    LiveRouletteService,
    LiveRouletteRoomService,
    GameSessionRepository,
    RouletteBetRepository,
    RouletteRoundRepository,
    LiveRouletteRoomRepository,
    UserRepository,
    WsAuthGuard,
    LiveRouletteProcessor
  ],
  exports: [LiveRouletteRoomService, LiveRouletteService]
})
export class LiveRouletteModule {}
