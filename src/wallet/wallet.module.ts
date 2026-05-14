import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { TransactionRepository } from './repositories/transaction.repository';
import { WithdrawRequestRepository } from './repositories/withdraw-request.repository';

@Module({
  controllers: [WalletController],
  providers: [WalletService,TransactionRepository,WithdrawRequestRepository],
  exports: [WalletService],
})
export class WalletModule {}