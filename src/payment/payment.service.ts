import { BadRequestException, Injectable, RawBodyRequest } from '@nestjs/common';
import { DepositDto } from './dto/deposit.dto';
import { StripePaymentProvider } from './providers/stripe-payment.provider';
import { IPaymentProvider } from './interfaces/payment-provider.inderface';
import { User } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class PaymentService {
  private readonly providers: Map<string, IPaymentProvider>;

  constructor(
    private readonly stripeProvider: StripePaymentProvider,
  ) {
    this.providers = new Map([['stripe', this.stripeProvider]]);
  }

  async createDeposit(user: User, dto: DepositDto) {
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
