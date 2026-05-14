import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType, WithdrawStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaService } from 'src/database/prisma.service';
import { TransactionRepository } from './repositories/transaction.repository';
import { DepositDto } from 'src/payment/dto/deposit.dto';
import { WithdrawRequestRepository } from './repositories/withdraw-request.repository';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { ReviewWithdrawDto } from './dto/review-withdraw.dto';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionRepository: TransactionRepository,
    private readonly withdrawRequestRepository:WithdrawRequestRepository 
  ) {}

  async getBalance(userId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!profile) throw new NotFoundException('Wallet not found');
    return { balance: profile.balance };
  }

  async deposit(userId: number, amount:number) {
    return this.prisma.$transaction(async (tx) => {
      // SELECT FOR UPDATE — захист від race condition
      const profile = await tx.$queryRaw<{ balance: Decimal }[]>`
        SELECT balance FROM profiles WHERE user_id = ${userId} FOR UPDATE
      `;
      if (!profile.length) throw new NotFoundException('Wallet not found');

      const balanceBefore = new Decimal(profile[0].balance);
      const decimalAmount = new Decimal(amount);
      const balanceAfter = balanceBefore.plus(amount);

      await tx.profile.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      return tx.transaction.create({
        data: {
          walletId: userId,
          type: TransactionType.DEPOSIT,
          amount:decimalAmount,
          balanceBefore,
          balanceAfter,
          referenceType: 'deposit',
        },
      });
    });
  }

  // Внутрішній метод — використовується RouletteService
  async deductBet(
    tx: any,
    userId: number,
    amount: Decimal,
    betId: string,
  ) {
    const profile = await tx.$queryRaw<{ balance: Decimal }[]>`
      SELECT balance FROM profiles WHERE user_id = ${userId} FOR UPDATE
    `;
    if (!profile.length) throw new NotFoundException('Wallet not found');

    const balanceBefore = new Decimal(profile[0].balance);
    if (balanceBefore.lessThan(amount)) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceAfter = balanceBefore.minus(amount);

    await tx.profile.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    await tx.transaction.create({
      data: {
        walletId: userId,
        type: TransactionType.BET,
        amount,
        balanceBefore,
        balanceAfter,
        referenceId: betId,
        referenceType: 'bet',
      },
    });

    return balanceAfter;
  }

  async createWithdrawRequest(userId: number, dto: CreateWithdrawDto) {
    return this.prisma.$transaction(async (tx) => {
      // Перевіряємо баланс і списуємо одразу
      const profile = await tx.$queryRaw<{ balance: Decimal }[]>`
        SELECT balance FROM profiles WHERE user_id = ${userId} FOR UPDATE
      `;
      if (!profile.length) throw new NotFoundException('Wallet not found');

      const balanceBefore = new Decimal(profile[0].balance);
      const amount = new Decimal(dto.amount);

      if (balanceBefore.lessThan(amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      const balanceAfter = balanceBefore.minus(amount);

      await tx.profile.update({
        where: { userId },
        data: { balance: balanceAfter },
      });

      // Транзакція типу WITHDRAWAL (гроші заморожені)
      await tx.transaction.create({
        data: {
          walletId: userId,
          type: TransactionType.WITHDRAWAL,
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'withdraw_request',
        },
      });

      // Створюємо заявку
      return tx.withdrawRequest.create({
        data: {
          userId,
          amount,
          cardLast4: dto.cardLast4,
          status: WithdrawStatus.PENDING,
        },
      });
    });
  }

  async getMyWithdrawRequests(userId: number, skip = 0, take = 20) {
    return this.withdrawRequestRepository.findAll({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async getAllWithdrawRequests(status?: WithdrawStatus, skip = 0, take = 20) {
    return this.withdrawRequestRepository.findAll({
      where: status ? { status } : undefined,
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async reviewWithdrawRequest(requestId: string, dto: ReviewWithdrawDto) {
    const request = await this.withdrawRequestRepository.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new NotFoundException('Withdraw request not found');

    if (request.status !== WithdrawStatus.PENDING) {
      throw new BadRequestException('Request already reviewed');
    }

    // Якщо REJECTED — повертаємо баланс
    if (dto.status === WithdrawStatus.REJECTED) {
      await this.prisma.$transaction(async (tx) => {
        const profile = await tx.$queryRaw<{ balance: Decimal }[]>`
          SELECT balance FROM profiles WHERE user_id = ${request.userId} FOR UPDATE
        `;
        const balanceBefore = new Decimal(profile[0].balance);
        const balanceAfter = balanceBefore.plus(request.amount);

        await tx.profile.update({
          where: { userId: request.userId },
          data: { balance: balanceAfter },
        });

        await tx.transaction.create({
          data: {
            walletId: request.userId,
            type: TransactionType.REFUND,
            amount: request.amount,
            balanceBefore,
            balanceAfter,
            referenceId: request.id,
            referenceType: 'withdraw_rejected',
          },
        });
        
        await tx.withdrawRequest.update({
          where: { id: requestId },
          data: { status: dto.status, comment: dto.comment },
        });
      });
    } else {
      // APPROVED — просто оновлюємо статус, гроші вже списані
      await this.withdrawRequestRepository.update({
        where: { id: requestId },
        data: { status: dto.status, comment: dto.comment },
      });
    }

    return { message: `Request ${dto.status.toLowerCase()}` };
  }
  // Внутрішній метод — виплата виграшу
  async creditWin(
    tx: any,
    userId: number,
    amount: Decimal,
    betId: string,
  ) {
    const profile = await tx.$queryRaw<{ balance: Decimal }[]>`
      SELECT balance FROM profiles WHERE user_id = ${userId} FOR UPDATE
    `;
    const balanceBefore = new Decimal(profile[0].balance);
    const balanceAfter = balanceBefore.plus(amount);

    await tx.profile.update({
      where: { userId },
      data: { balance: balanceAfter },
    });

    await tx.transaction.create({
      data: {
        walletId: userId,
        type: TransactionType.WIN,
        amount,
        balanceBefore,
        balanceAfter,
        referenceId: betId,
        referenceType: 'win',
      },
    });

    return balanceAfter;
  }

  async getHistory(userId: number, skip = 0, take = 20) {
    return this.transactionRepository.findAll({
      where: { walletId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }
}