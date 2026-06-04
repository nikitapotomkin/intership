import { Module } from '@nestjs/common';
import { AdminController} from './admin.controller';
import { UserModule } from 'src/user/user.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { LiveRouletteModule } from 'src/live-roulette/live-roulette.module';

@Module({
  imports: [UserModule,WalletModule,LiveRouletteModule],
  controllers: [AdminController],
})
export class AdminModule {}