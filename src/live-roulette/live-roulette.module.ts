import { Module } from '@nestjs/common';
import { LiveRouletteGateway } from './live-roulette.gateway';
import { LiveRouletteService } from './live-roulette.service';
import { LiveRouletteRoomService } from './live-roulette-room.service';
import { LiveRouletteController } from './live-roulette.controller';
import { WalletModule } from 'src/wallet/wallet.module';
import { RedisModule } from 'src/redis/redis.module';
import { GameSessionRepository } from './repositories/game-session.repository';
import { RouletteBetRepository } from './repositories/roulette-bet.repository';
import { RouletteRoundRepository } from './repositories/roulette-round.repository';
import { LiveRouletteRoomRepository } from './repositories/live-roulette-room.repository';
import { UserRepository } from 'src/user/repositories/user.repository';
import { WsAuthGuard } from 'src/common/guards/ws-auth.guard';

@Module({
  imports: [RedisModule, WalletModule],
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
    WsAuthGuard
  ],
  exports: [LiveRouletteRoomService, LiveRouletteService]
})
export class LiveRouletteModule {}
