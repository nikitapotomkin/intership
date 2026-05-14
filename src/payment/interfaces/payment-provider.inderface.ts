import { RawBodyRequest } from "@nestjs/common";
import { User } from "@prisma/client";
import { Request } from 'express';

export interface IPaymentProvider {
  createDeposit(user: User, amount: number): Promise<{ url: string }>;
  handleWebhook(req: RawBodyRequest<Request>): Promise<{ received: boolean }>;
}