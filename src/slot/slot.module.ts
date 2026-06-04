import { Module } from '@nestjs/common';
import { SlotController } from './slot.controller';
import { SlotService } from './slot.service';
import { WalletModule } from 'src/wallet/wallet.module';
import { SlotRoundRepository } from './repositories/slot-round.repository';

@Module({
  imports: [WalletModule],
  controllers: [SlotController],
  providers: [SlotService,SlotRoundRepository],
})
export class SlotModule {}