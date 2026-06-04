import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeModule } from 'src/stripe/stripe.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { ProfileRepository } from 'src/user/repositories/profile.repository';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { PaymentProviderRepository } from './repositories/payment.repository';

@Module({
  imports: [StripeModule, WalletModule],
  controllers: [PaymentController],
  providers: [PaymentService,ProfileRepository,StripePaymentProvider,PaymentProviderRepository],
})
export class PaymentModule {}