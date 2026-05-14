import { Injectable } from '@nestjs/common';
import { Prisma, WithdrawRequest } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class WithdrawRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.WithdrawRequestCreateArgs): Promise<WithdrawRequest> {
    return this.prisma.withdrawRequest.create(args);
  }

  async findOne<T extends Prisma.WithdrawRequestFindFirstArgs>(
    args: T,
  ): Promise<Prisma.WithdrawRequestGetPayload<T> | null> {
    return this.prisma.withdrawRequest.findFirst(args) as any;
  }

  async findUnique(args: Prisma.WithdrawRequestFindUniqueArgs): Promise<WithdrawRequest | null> {
    return this.prisma.withdrawRequest.findUnique(args);
  }

  async findAll(args?: Prisma.WithdrawRequestFindManyArgs): Promise<WithdrawRequest[]> {
    return this.prisma.withdrawRequest.findMany(args);
  }

  async update(args: Prisma.WithdrawRequestUpdateArgs): Promise<WithdrawRequest> {
    return this.prisma.withdrawRequest.update(args);
  }

  async count(where?: Prisma.WithdrawRequestWhereInput): Promise<number> {
    return this.prisma.withdrawRequest.count({ where });
  }
}