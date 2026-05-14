import { Module } from '@nestjs/common';
import { RouletteService } from './roulette.service';
import { RouletteController } from './roulette.controller';
import { RouletteRoundRepository } from './repositories/roulette-round.repository';
import { RouletteBetRepository } from './repositories/roulette-bet.repository';
import { WalletModule } from 'src/wallet/wallet.module';
import { GameSessionRepository } from './repositories/game-session.repository';

@Module({
  imports: [WalletModule],
  controllers: [RouletteController],
  providers: [RouletteService, RouletteRoundRepository, RouletteBetRepository,GameSessionRepository],
})
export class RouletteModule {}