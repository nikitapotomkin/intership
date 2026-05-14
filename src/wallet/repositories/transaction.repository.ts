import { Injectable } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(args: Prisma.TransactionCreateArgs): Promise<Transaction> {
    return this.prisma.transaction.create(args);
  }

  async findOne(args: Prisma.TransactionFindFirstArgs): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst(args);
  }

  async findUnique(args: Prisma.TransactionFindUniqueArgs): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique(args);
  }

  async findAll(args?: Prisma.TransactionFindManyArgs): Promise<Transaction[]> {
    return this.prisma.transaction.findMany(args);
  }

  async count(where?: Prisma.TransactionWhereInput): Promise<number> {
    return this.prisma.transaction.count({ where });
  }
}