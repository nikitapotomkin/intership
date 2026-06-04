import {
  BadRequestException,
  Injectable,
  RawBodyRequest,
} from '@nestjs/common';
import { DepositDto } from './dto/deposit.dto';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { IPaymentProvider } from './interfaces/payment-provider.inderface';
import { Request } from 'express';
import { PaymentProviderRepository } from './repositories/payment.repository';
import { User } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(
    private readonly stripeProvider: StripePaymentProvider,
    private readonly paymentProviderRepository: PaymentProviderRepository,
  ) {
    this.providers = new Map([['stripe', this.stripeProvider]]);
  }

  async createDeposit(user: User, dto: DepositDto) {
    const paymentProvider = await this.paymentProviderRepository.findUnique({
      where: { code: dto.provider },
    });

    if (!paymentProvider)
      throw new BadRequestException('Unknown payment provider');
    if (!paymentProvider.isActive)
      throw new BadRequestException(`Provider ${dto.provider} is disabled`);

    const provider = this.providers.get(dto.provider);
    if (!provider) throw new BadRequestException('Unknown payment provider');
    return provider.createDeposit(user, dto.amount);
  }

  async handleWebhook(provider: string, req: RawBodyRequest<Request>) {
    const p = this.providers.get(provider);
    if (!p) throw new BadRequestException('Unknown payment provider');
    return p.handleWebhook(req);
  }
}
