import { Module } from '@nestjs/common';
import { AdminController} from './admin.controller';
import { UserModule } from 'src/user/user.module';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  imports: [UserModule,WalletModule],
  controllers: [AdminController],
})
export class AdminModule {}