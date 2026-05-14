import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      configService.getOrThrow<string>('STRIPE_SECRET_KEY'),
    );
  }

  async createCustomer(email: string, name: string): Promise<string> {
    const customer = await this.stripe.customers.create({
      email,
      name,
    });
    return customer.id;
  }

  async updateCustomer(customerId: string, data) {
    await this.stripe.customers.update(customerId, data);
  }

  async createDeposit(
    customerId: string,
    amount: number,
  ): Promise<{ url: string }> {
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,

      mode: 'payment',

      line_items: [
        {
          price_data: {
            currency: 'usd',

            product_data: {
              name: 'Balance deposit',
            },

            unit_amount: Math.round(amount * 100),
          },

          quantity: 1,
        },
      ],

      success_url: `${this.configService.getOrThrow('ALLOWED_ORIGIN')}/payment-success`,
      //cancel_url: `${this.configService.getOrThrow('ALLOWED_ORIGIN')}/payment-failed`,
    });

    return {
      url: session.url!,
    };
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.getOrThrow<string>(
      'STRIPE_WEBHOOK_SECRET',
    );
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    );
  }
}
