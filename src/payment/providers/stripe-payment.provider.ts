import {
  BadRequestException,
  Injectable,
  OnModuleInit,
  RawBodyRequest,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { ProfileRepository } from 'src/user/repositories/profile.repository';
import { IPaymentProvider } from '../interfaces/payment-provider.inderface';
import { WalletService } from 'src/wallet/wallet.service';
import { StripeService } from 'src/stripe/stripe.service';
import { Request } from 'express';
import Stripe from 'stripe';

@Injectable()
export class StripePaymentProvider implements IPaymentProvider {

  constructor(
    private readonly stripeService: StripeService,
    private readonly profileRepository: ProfileRepository,
    private readonly walletService: WalletService
  ) {}

  async createDeposit(user: User, amount: number) {
    const profile = await this.profileRepository.findUnique({
      where: { userId: user.id },
    });

    let customerId = profile?.stripeCustomerId;
    if (!customerId) {
      customerId = await this.stripeService.createCustomer(
        user.email!,
        user.username ?? 'Unknown',
      );
      await this.profileRepository.update(user.id, {
        stripeCustomerId: customerId,
      });
    }

    return this.stripeService.createDeposit(customerId, amount);
  }

  async handleWebhook(req: RawBodyRequest<Request>,providerId:number) {
    const signature = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;
    try {
      event = this.stripeService.verifyWebhookSignature(
        req.rawBody!,
        signature,
      );
    } catch (err) {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;

      const profile = await this.profileRepository.findUnique({
        where: { stripeCustomerId: session.customer },
      });

      if (!profile) return { received: true };

      const amount = session.amount_total / 100;
      const externalId = session.payment_intent as string;
      try {
        await this.walletService.deposit(
          profile.userId,
          amount,
          providerId,
          externalId,
        );
      } catch (err) {
        if ((err as any)?.code === 'P2002') {
          return { received: true };
        }
      }
    }

    return { received: true };
  }
}
