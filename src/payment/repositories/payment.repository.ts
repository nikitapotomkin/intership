import { Injectable } from '@nestjs/common';
import { PaymentProvider, Prisma } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class PaymentProviderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUnique(args: Prisma.PaymentProviderFindUniqueArgs): Promise<PaymentProvider | null> {
    return this.prisma.paymentProvider.findUnique(args);
  }
}